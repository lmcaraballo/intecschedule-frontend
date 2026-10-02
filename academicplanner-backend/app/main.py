import asyncio
import contextlib
import time
from collections import deque
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from .errors import ApiError
from .models import LoginRequest, RefreshRequest, ScheduleResponse, TokenResponse
from .sessions import SessionStore
from .portal import BeeCampusProvider
from .calendar import router as calendar_router


def error_response(error):
    return JSONResponse(
        status_code=error.status,
        content={"error": {"code": error.code, "message": error.message}},
        headers={"Cache-Control": "no-store", "Pragma": "no-cache"},
    )


def create_app(provider=None, store=None):
    provider = provider or BeeCampusProvider()
    store = store or SessionStore()
    slots = asyncio.Semaphore(4)
    attempts = {}

    @asynccontextmanager
    async def lifespan(_app):
        async def reap():
            while True:
                await asyncio.sleep(30)
                await store.cleanup()

        task = asyncio.create_task(reap())
        yield
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task
        await store.cleanup(all_sessions=True)

    app = FastAPI(title="AcademicPlanner API", version="0.1.0", lifespan=lifespan)
    app.include_router(calendar_router)
    bearer = HTTPBearer(auto_error=False)

    @app.middleware("http")
    async def protect(request: Request, call_next):
        if request.method == "POST":
            chunks, size = [], 0
            async for chunk in request.stream():
                size += len(chunk)
                if size > 4096:
                    return error_response(ApiError("INVALID_REQUEST"))
                chunks.append(chunk)
            request._body = b"".join(chunks)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.exception_handler(ApiError)
    async def api_error(_request, error):
        return error_response(error)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request, _error):
        # Pydantic's default response can echo input containing a password.
        return error_response(ApiError("INVALID_REQUEST"))

    @app.exception_handler(Exception)
    async def unexpected(_request, _error):
        return error_response(ApiError("UNKNOWN_ERROR"))

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    @app.post("/user/login", response_model=TokenResponse)
    async def login(body: LoginRequest, request: Request):
        now = time.monotonic()
        for host in list(attempts):
            while attempts[host] and attempts[host][0] <= now - 60:
                attempts[host].popleft()
            if not attempts[host]:
                del attempts[host]
        host = request.client.host if request.client else "unknown"
        if host not in attempts and len(attempts) >= 1024:
            raise ApiError("RATE_LIMITED")
        queue = attempts.setdefault(host, deque())
        if len(queue) >= 8:
            raise ApiError("RATE_LIMITED")
        queue.append(now)
        if slots.locked():
            raise ApiError("PORTAL_UNAVAILABLE")
        await store.cleanup()
        portal = None
        try:
            async with slots, asyncio.timeout(15):
                portal = await provider.login(
                    body.studentId, body.password.get_secret_value()
                )
                return store.add(body.studentId, portal)
        except TimeoutError:
            raise ApiError("PORTAL_UNAVAILABLE") from None
        finally:
            body.password = ""
            if portal is not None and not any(
                s.portal is portal for s in store.access.values()
            ):
                await portal.close()

    @app.post("/schedule", response_model=ScheduleResponse)
    async def schedule(auth: HTTPAuthorizationCredentials | None = Depends(bearer)):
        if auth is None or len(auth.credentials) > 512:
            raise ApiError("AUTHENTICATION_REQUIRED")
        session = await store.take(auth.credentials)
        try:
            if slots.locked():
                raise ApiError("PORTAL_UNAVAILABLE")
            async with slots, asyncio.timeout(15):
                result = ScheduleResponse.model_validate(
                    await session.portal.schedule(session.student_id)
                )
                if result.student.id != session.student_id:
                    raise ApiError("PORTAL_STRUCTURE_CHANGED")
                return result
        except TimeoutError:
            raise ApiError("PORTAL_UNAVAILABLE") from None
        finally:
            await session.portal.close()

    @app.post("/user/refresh-token", response_model=TokenResponse)
    async def refresh(body: RefreshRequest):
        return await store.rotate(body.refreshToken.get_secret_value())

    return app


app = create_app()
