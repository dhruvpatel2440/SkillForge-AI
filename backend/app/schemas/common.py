from typing import Any, Optional
from pydantic import BaseModel


class SuccessResponse(BaseModel):
    success: bool = True
    data: Any = None
    message: str = ""


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail


def ok(data: Any = None, message: str = "") -> dict:
    return {"success": True, "data": data, "message": message}


def err(code: str, message: str) -> dict:
    return {"success": False, "error": {"code": code, "message": message}}
