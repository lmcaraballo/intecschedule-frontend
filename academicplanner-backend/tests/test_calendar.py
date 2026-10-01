from datetime import datetime

from fastapi.testclient import TestClient

from app.calendar import CalendarEvent, get_google_service
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
    period = institutional.json()[0]
    assert period["startsOn"] == "2026-08-03"
    assert period["endsOn"] == "2026-10-17"
    assert len(period["dates"]) == 15
    assert any(item["kind"] == "no_class" for item in period["dates"])
    dates = {item["date"]: item for item in period["dates"]}
    assert dates["2026-09-24"]["title"] == "Día de Nuestra Señora de las Mercedes"


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
