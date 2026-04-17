"""NATS consumer that runs scenario calculations."""
from __future__ import annotations

import asyncio
import json
import logging
import signal

from nats.aio.client import Client as NATSClient

from netwatt.db import SessionLocal
from netwatt.nats_bus.client import STREAM_NAME, SUBJECT_PREFIX
from netwatt.scenarios.calc_runner import perform_calculation
from netwatt.settings import settings

logger = logging.getLogger("netwatt.calc_worker")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


async def _run() -> None:
    nc = NATSClient()
    await nc.connect(servers=[settings.nats_url], max_reconnect_attempts=-1)
    js = nc.jetstream()

    sub = await js.pull_subscribe(
        subject=f"{SUBJECT_PREFIX}.>",
        durable="calc_worker",
        stream=STREAM_NAME,
    )
    logger.info("calc_worker subscribed to %s.> (stream=%s)", SUBJECT_PREFIX, STREAM_NAME)

    stop = asyncio.Event()

    def _handle_signal(*_args: object) -> None:
        logger.info("shutdown requested")
        stop.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        asyncio.get_event_loop().add_signal_handler(sig, _handle_signal)

    while not stop.is_set():
        try:
            msgs = await sub.fetch(batch=5, timeout=2)
        except TimeoutError:
            continue
        except Exception as e:  # noqa: BLE001
            logger.warning("fetch error: %s", e)
            await asyncio.sleep(1)
            continue
        for msg in msgs:
            try:
                payload = json.loads(msg.data)
                scenario_id = int(payload["scenario_id"])
                logger.info("processing scenario %s", scenario_id)
                async with SessionLocal() as session:
                    status = await perform_calculation(session, scenario_id)
                    logger.info("scenario %s -> %s", scenario_id, status)
                await msg.ack()
            except Exception as e:  # noqa: BLE001
                logger.exception("worker error: %s", e)
                await msg.nak()

    await nc.drain()


def main() -> None:
    asyncio.run(_run())


if __name__ == "__main__":
    main()
