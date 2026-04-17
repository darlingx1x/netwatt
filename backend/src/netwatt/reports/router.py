from fastapi import APIRouter, Query
from fastapi.responses import Response

from netwatt.deps import CurrentUser, SessionDep
from netwatt.errors import bad_request, forbidden, not_found
from netwatt.reports.pdf import render_pdf
from netwatt.reports.xlsx import render_xlsx
from netwatt.scenarios.service import get_scenario

router = APIRouter(prefix="/api/scenarios", tags=["reports"])


@router.get("/{scenario_id}/report.pdf")
async def api_report_pdf(
    scenario_id: int,
    session: SessionDep,
    user: CurrentUser,
    lang: str = Query("ru", pattern="^(ru|uz|en)$"),
) -> Response:
    sc = await get_scenario(session, scenario_id)
    if sc is None:
        raise not_found("scenario_not_found")
    if sc.owner_id != user.id and user.role != "admin":
        raise forbidden("not_scenario_owner")
    if sc.result is None:
        raise bad_request("no_result_yet")
    pdf_bytes = render_pdf(sc, user, lang=lang)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="scenario_{scenario_id}.pdf"'},
    )


@router.get("/{scenario_id}/report.xlsx")
async def api_report_xlsx(
    scenario_id: int,
    session: SessionDep,
    user: CurrentUser,
    lang: str = Query("ru", pattern="^(ru|uz|en)$"),
) -> Response:
    sc = await get_scenario(session, scenario_id)
    if sc is None:
        raise not_found("scenario_not_found")
    if sc.owner_id != user.id and user.role != "admin":
        raise forbidden("not_scenario_owner")
    if sc.result is None:
        raise bad_request("no_result_yet")
    xlsx_bytes = render_xlsx(sc, lang=lang)
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="scenario_{scenario_id}.xlsx"'},
    )
