from fastapi import HTTPException, status


class NetWattError(Exception):
    pass


class NotFoundError(NetWattError):
    pass


class PermissionDeniedError(NetWattError):
    pass


class ValidationFailedError(NetWattError):
    pass


def not_found(detail: str = "not_found") -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def forbidden(detail: str = "forbidden") -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def bad_request(detail: str = "bad_request") -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def unauthorized(detail: str = "unauthorized") -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)
