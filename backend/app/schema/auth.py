from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    is_admin: bool = False


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ProfileUpdateRequest(BaseModel):
    username: Optional[str] = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v.strip()) < 2:
            raise ValueError("Username must be at least 2 characters")
        return v.strip() if v else v


class ProfileUpdateResponse(BaseModel):
    user: "UserRead"
    access_token: Optional[str] = None

    class Config:
        from_attributes = True


class UserRead(BaseModel):
    id: int
    username: str
    is_active: bool
    is_admin: bool = False
    created_at: datetime

    class Config:
        from_attributes = True
