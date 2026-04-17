from pydantic import BaseModel, EmailStr, Field


class RegisterReq(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=6, max_length=200)
    role: str = Field(pattern="^(admin|engineer)$", default="engineer")
    lang: str = Field(pattern="^(ru|uz|en)$", default="ru")


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class RefreshReq(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"


class UserRead(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    lang: str
    is_active: bool


class LoginResp(BaseModel):
    user: UserRead
    tokens: TokenPair
