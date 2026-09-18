import hashlib
import secrets
import time
from dataclasses import dataclass, field
from .errors import ApiError
from .models import TokenResponse


def digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


@dataclass
class Session:
    student_id: str
    portal: object
    expires: float
    access: str = field(repr=False)
    refresh: str = field(repr=False)


class SessionStore:
    """Single-worker, bounded, ephemeral sessions. Schedule consumes and closes one."""
    def __init__(self, ttl=900, capacity=100, clock=time.monotonic):
        self.ttl, self.capacity, self.clock = ttl, capacity, clock
        self.access: dict[str, Session] = {}
        self.refresh: dict[str, Session] = {}

    def add(self, student_id, portal):
        if len(self.access) >= self.capacity:
            raise ApiError('PORTAL_UNAVAILABLE')
        access, refresh = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        session = Session(student_id, portal, self.clock() + self.ttl, digest(access), digest(refresh))
        self.access[session.access] = session
        self.refresh[session.refresh] = session
        return TokenResponse(accessToken=access, refreshToken=refresh, expiresIn=self.ttl)

    def remove(self, session):
        self.access.pop(session.access, None)
        self.refresh.pop(session.refresh, None)

    async def take(self, token):
        session = self.access.get(digest(token))
        if session is None:
            raise ApiError('AUTHENTICATION_REQUIRED')
        self.remove(session)  # No await until exclusive ownership has been established.
        if session.expires <= self.clock():
            await session.portal.close()
            raise ApiError('AUTHENTICATION_REQUIRED')
        return session

    async def rotate(self, token):
        session = self.refresh.get(digest(token))
        if session is None:
            raise ApiError('AUTHENTICATION_REQUIRED')
        self.remove(session)
        if session.expires <= self.clock():
            await session.portal.close()
            raise ApiError('AUTHENTICATION_REQUIRED')
        access, refresh = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        session.access, session.refresh = digest(access), digest(refresh)
        self.access[session.access] = session
        self.refresh[session.refresh] = session
        return TokenResponse(accessToken=access, refreshToken=refresh, expiresIn=max(1, int(session.expires-self.clock())))

    async def cleanup(self, all_sessions=False):
        expired = [s for s in self.access.values() if all_sessions or s.expires <= self.clock()]
        for session in expired:
            self.remove(session)
            await session.portal.close()
