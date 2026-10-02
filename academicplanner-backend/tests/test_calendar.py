import asyncio
from datetime import datetime

import httpx
from fastapi.testclient import TestClient

from app.calendar import (
    CalendarEvent,
    EventCreate,
    GoogleCalendarService,
    get_google_service,
)
from app.main import create_app


def event_data(**changes):
    values = {
        "id": "google-1",
        "title": "Tutoría de prueba",
        "description": None,
        "startAt": "2026-10-01T16:00:00-04:00",
        "endAt": "2026-10-01T17:00:00-04:00",
        "timezone": "America/Santo_Domingo",
        "location": "Biblioteca",
        "sourceId": "4a0b14e1-5e95-4a51-a89d-2b62365c69f7",
        "sourceType": "personal",
        "reminderMinutes": 15,
        "createdAt": "2026-10-01T12:00:00Z",
        "updatedAt": "2026-10-01T12:00:00Z",
        "revision": 0,
        "htmlLink": "https://calendar.google.com/event/1",
    }
    values.update(changes)
    return values


class FakeCalendar:
    def __init__(self):
        self.event = CalendarEvent.model_validate(event_data())

    async def list(self, _from: datetime, _to: datetime):
        return [self.event]

    async def create(self, body):
        self.event = CalendarEvent.model_validate(
            {**event_data(), **body.model_dump(by_alias=True)}
        )
        return self.event

    async def update(self, _event_id, body):
        changes = body.model_dump(by_alias=True, exclude_unset=True)
        self.event = CalendarEvent.model_validate(
            {**self.event.model_dump(by_alias=True), **changes, "revision": 1}
        )
        return self.event

    async def delete(self, _event_id):
        self.event = None


def test_calendar_configuration_and_institutional_dates(monkeypatch):
    monkeypatch.delenv("GOOGLE_OAUTH_CLIENT_ID", raising=False)
    with TestClient(create_app()) as client:
        config = client.get("/calendar/config")
        institutional = client.get("/calendar/institutional")
    assert config.status_code == 200
    assert config.json()["available"] is False
    assert config.json()["clientId"] is None
    periods = institutional.json()
    assert len(periods) == 4
    period = periods[0]
    assert period["startsOn"] == "2026-08-03"
    assert period["endsOn"] == "2026-10-17"
    assert len(period["dates"]) == 15
    assert any(item["kind"] == "no_class" for item in period["dates"])
    dates = {item["date"]: item for item in period["dates"]}
    assert dates["2026-09-24"]["title"] == "Día de Nuestra Señora de las Mercedes"
    assert periods[-1]["endsOn"] == "2027-07-17"
    christmas = next(
        item for item in periods[1]["dates"] if item["date"] == "2026-12-24"
    )
    assert christmas["endsOn"] == "2027-01-03"


def test_calendar_event_crud_contract():
    app = create_app()
    fake = FakeCalendar()
    app.dependency_overrides[get_google_service] = lambda: fake
    headers = {"Authorization": "Bearer google-token-for-test"}
    payload = {
        "title": "Tutoría de prueba",
        "description": None,
        "startAt": "2026-10-01T16:00:00-04:00",
        "endAt": "2026-10-01T17:00:00-04:00",
        "timezone": "America/Santo_Domingo",
        "location": "Biblioteca",
        "sourceId": "4a0b14e1-5e95-4a51-a89d-2b62365c69f7",
        "sourceType": "personal",
        "reminderMinutes": 15,
    }
    with TestClient(app) as client:
        listed = client.get(
            "/events",
            headers=headers,
            params={
                "from": "2026-10-01T00:00:00-04:00",
                "to": "2026-10-02T00:00:00-04:00",
            },
        )
        created = client.post("/events", headers=headers, json=payload)
        updated = client.patch(
            "/events/google-1", headers=headers, json={"title": "Tutoría actualizada"}
        )
        deleted = client.delete("/events/google-1", headers=headers)
    assert listed.status_code == 200 and listed.json()[0]["sourceType"] == "personal"
    assert created.status_code == 201 and created.json()["title"] == "Tutoría de prueba"
    assert (
        updated.status_code == 200 and updated.json()["title"] == "Tutoría actualizada"
    )
    assert deleted.status_code == 204


def test_calendar_rejects_missing_token_and_invalid_range():
    with TestClient(create_app()) as client:
        missing = client.get(
            "/events",
            params={
                "from": "2026-10-01T00:00:00-04:00",
                "to": "2026-10-02T00:00:00-04:00",
            },
        )
    assert missing.status_code == 401
    assert missing.json()["error"]["code"] == "GOOGLE_CALENDAR_AUTH_REQUIRED"


def test_google_service_reads_primary_and_separate_managed_calendars():
    requests: list[tuple[str, str]] = []

    def google_event(event_id: str, title: str, source_type: str | None = None):
        private = ({
            GoogleCalendarService.SOURCE_KEY: "4a0b14e1-5e95-4a51-a89d-2b62365c69f7",
            GoogleCalendarService.SOURCE_TYPE_KEY: source_type,
        } if source_type else {})
        return {
            "id": event_id,
            "summary": title,
            "start": {"dateTime": "2026-10-02T10:00:00-04:00"},
            "end": {"dateTime": "2026-10-02T11:00:00-04:00"},
            "extendedProperties": {"private": private},
            "created": "2026-10-01T12:00:00Z",
            "updated": "2026-10-01T12:00:00Z",
            "sequence": 0,
        }

    def handler(request: httpx.Request):
        requests.append((request.method, request.url.path))
        if request.url.path.endswith("/users/me/calendarList"):
            return httpx.Response(200, json={"items": [
                {"id": "schedule-id", "summary": "AcademicPlanner · Horario", "accessRole": "owner"},
                {"id": "intec-id", "summary": "AcademicPlanner · INTEC", "accessRole": "owner"},
            ]})
        if request.url.path.endswith("/calendars/primary/events"):
            return httpx.Response(200, json={"items": [google_event("personal-1", "Evento creado en Google")]})
        if request.url.path.endswith("/calendars/schedule-id/events"):
            return httpx.Response(200, json={"items": [google_event("class-1", "Clase", "schedule")]})
        if request.url.path.endswith("/calendars/intec-id/events"):
            return httpx.Response(200, json={"items": [google_event("intec-1", "Fecha INTEC", "institutional")]})
        raise AssertionError(f"Unexpected request: {request.method} {request.url}")

    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
            service = GoogleCalendarService("token", http_client)
            return await service.list(
                datetime.fromisoformat("2026-10-01T00:00:00-04:00"),
                datetime.fromisoformat("2026-10-10T00:00:00-04:00"),
            )

    events = asyncio.run(run())
    assert [event.source_type for event in events] == ["google", "schedule", "institutional"]
    assert {event.id for event in events} == {"primary:personal-1", "schedule:class-1", "institutional:intec-1"}
    assert ("GET", "/calendar/v3/calendars/primary/events") in requests


def test_google_service_writes_personal_to_primary_calendar():
    requests: list[tuple[str, str]] = []

    def handler(request: httpx.Request):
        requests.append((request.method, request.url.path))
        if request.method == "GET":
            return httpx.Response(200, json={"items": []})
        return httpx.Response(200, json={
            "id": "created-personal",
            "summary": "Estudiar",
            "start": {"dateTime": "2026-10-02T16:00:00-04:00", "timeZone": "America/Santo_Domingo"},
            "end": {"dateTime": "2026-10-02T17:00:00-04:00", "timeZone": "America/Santo_Domingo"},
            "extendedProperties": {"private": {
                GoogleCalendarService.SOURCE_KEY: "4a0b14e1-5e95-4a51-a89d-2b62365c69f7",
                GoogleCalendarService.SOURCE_TYPE_KEY: "personal",
            }},
            "created": "2026-10-01T12:00:00Z",
            "updated": "2026-10-01T12:00:00Z",
            "sequence": 0,
        })

    event = EventCreate.model_validate({
        "title": "Estudiar",
        "startAt": "2026-10-02T16:00:00-04:00",
        "endAt": "2026-10-02T17:00:00-04:00",
        "timezone": "America/Santo_Domingo",
        "sourceId": "4a0b14e1-5e95-4a51-a89d-2b62365c69f7",
        "sourceType": "personal",
    })

    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
            return await GoogleCalendarService("token", http_client).create(event)

    created = asyncio.run(run())
    assert created.id == "primary:created-personal"
    assert requests == [
        ("GET", "/calendar/v3/calendars/primary/events"),
        ("POST", "/calendar/v3/calendars/primary/events"),
    ]
