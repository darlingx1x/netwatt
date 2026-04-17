from fastapi import APIRouter, Request

from netwatt.auth.schemas import (
    LoginReq,
    LoginResp,
    RefreshReq,
    RegisterReq,
    TokenPair,
    UserRead,
)
from netwatt.auth.service import (
    AuthError,
    authenticate,
    issue_pair,
    register,
    revoke_access,
    rotate_refresh,
)
from netwatt.deps import AdminUser, CurrentUser, SessionDep, client_ip, client_ua
from netwatt.errors import bad_request, unauthorized

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=201)
async def api_register(req: RegisterReq, session: SessionDep, _: AdminUser) -> UserRead:
    try:
        user = await register(session, req)
    except AuthError as e:
        raise bad_request(str(e)) from e
    return UserRead.model_validate(user, from_attributes=True)


@router.post("/login", response_model=LoginResp)
async def api_login(req: LoginReq, session: SessionDep, request: Request) -> LoginResp:
    try:
        user = await authenticate(session, str(req.email), req.password)
    except AuthError as e:
        raise unauthorized(str(e)) from e
    access, refresh = await issue_pair(session, user, client_ip(request), client_ua(request))
    return LoginResp(
        user=UserRead.model_validate(user, from_attributes=True),
        tokens=TokenPair(access_token=access, refresh_token=refresh),
    )


@router.post("/refresh", response_model=TokenPair)
async def api_refresh(req: RefreshReq, session: SessionDep, request: Request) -> TokenPair:
    try:
        _, access, refresh = await rotate_refresh(
            session, req.refresh_token, client_ip(request), client_ua(request)
        )
    except AuthError as e:
        raise unauthorized(str(e)) from e
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/logout", status_code=204)
async def api_logout(
    session: SessionDep,
    _: CurrentUser,
    request: Request,
) -> None:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        await revoke_access(session, auth.split(" ", 1)[1].strip())


@router.get("/me", response_model=UserRead)
async def api_me(user: CurrentUser) -> UserRead:
    return UserRead.model_validate(user, from_attributes=True)
