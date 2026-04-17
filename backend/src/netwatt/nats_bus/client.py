from __future__ import annotations

import json
import logging
from typing import Any

from nats.aio.client import Client as NATSClient
from nats.js import JetStreamContext
from nats.js.api import RetentionPolicy, StorageType, StreamConfig

from netwatt.settings import settings

logger = logging.getLogger(__name__)

STREAM_NAME = "SCENARIO_CALC"
SUBJECT_PREFIX = "calc.scenario"


class NatsBus:
    def __init__(self) -> None:
        self._nc: NATSClient | None = None
        self._js: JetStreamContext | None = None

    async def connect(self) -> None:
        if self._nc and self._nc.is_connected:
            return
        self._nc = await NATSClient().connect(servers=[settings.nats_url]) if False else NATSClient()
        self._nc = NATSClient()
        await self._nc.connect(servers=[settings.nats_url], max_reconnect_attempts=5)
        self._js = self._nc.jetstream()
        await self._ensure_stream()

    async def _ensure_stream(self) -> None:
        assert self._js is not None
        cfg = StreamConfig(
            name=STREAM_NAME,
            subjects=[f"{SUBJECT_PREFIX}.>"],
            retention=RetentionPolicy.WORK_QUEUE,
            storage=StorageType.FILE,
            max_age=24 * 60 * 60 * 10**9,  # 24h
        )
        try:
            await self._js.stream_info(STREAM_NAME)
        except Exception:
            await self._js.add_stream(cfg)

    async def publish_calc(self, scenario_id: int, meta: dict[str, Any] | None = None) -> None:
        if self._js is None:
            await self.connect()
        assert self._js is not None
        payload = json.dumps({"scenario_id": scenario_id, "meta": meta or {}}).encode()
        await self._js.publish(f"{SUBJECT_PREFIX}.{scenario_id}", payload)

    async def close(self) -> None:
        if self._nc is not None:
            await self._nc.drain()
        self._nc = None
        self._js = None


bus = NatsBus()
