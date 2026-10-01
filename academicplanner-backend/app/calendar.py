import os
from datetime import datetime
from typing import Annotated, Any, Literal
from urllib.parse import quote
from uuid import NAMESPACE_URL, UUID, uuid5
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx
from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from .errors import ApiError


class EventFields(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    start_at: datetime = Field(alias="startAt")
    end_at: datetime = Field(alias="endAt")
    timezone: str = Field(min_length=1, max_length=100)
    location: str | None = Field(default=None, max_length=300)
    source_id: UUID = Field(alias="sourceId")
    source_type: Literal["personal", "schedule", "institutional", "google"] = Field(
        default="personal", alias="sourceType"
    )
    reminder_minutes: int | None = Field(
        default=None, ge=0, le=10080, alias="reminderMinutes"
    )

    @model_validator(mode="after")
    def valid_event(self):
        self.title = self.title.strip()
        if (
            not self.title
            or self.start_at.tzinfo is None
            or self.end_at.tzinfo is None
            or self.end_at <= self.start_at
        ):
            raise ValueError("Invalid event")
        try:
            ZoneInfo(self.timezone)
        except ZoneInfoNotFoundError:
            raise ValueError("Invalid timezone") from None
        return self


class EventCreate(EventFields):
    pass


class EventUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    start_at: datetime | None = Field(default=None, alias="startAt")
    end_at: datetime | None = Field(default=None, alias="endAt")
    timezone: str | None = Field(default=None, min_length=1, max_length=100)
    location: str | None = Field(default=None, max_length=300)
    reminder_minutes: int | None = Field(
        default=None, ge=0, le=10080, alias="reminderMinutes"
    )

    @model_validator(mode="after")
    def valid_update(self):
        if not self.model_fields_set:
            raise ValueError("Empty update")
        if self.title is not None:
            self.title = self.title.strip()
            if not self.title:
                raise ValueError("Invalid title")
        if any(
            value is not None and value.tzinfo is None
            for value in (self.start_at, self.end_at)
        ):
            raise ValueError("Timezone required")
        if self.timezone is not None:
            try:
                ZoneInfo(self.timezone)
            except ZoneInfoNotFoundError:
                raise ValueError("Invalid timezone") from None
        return self


class CalendarEvent(EventFields):
    id: str
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    revision: int = Field(ge=0)
    html_link: str | None = Field(default=None, alias="htmlLink")


class GoogleCalendarConfig(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    available: bool
    client_id: str | None = Field(alias="clientId")
    scopes: list[str]
    calendar_name: str = Field(alias="calendarName")


class InstitutionalDate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    date: str
    ends_on: str | None = Field(default=None, alias="endsOn")
    kind: Literal["no_class", "milestone"]
    title: str
    detail: str


class InstitutionalPeriod(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    starts_on: str = Field(alias="startsOn")
    ends_on: str = Field(alias="endsOn")
    timezone: str
    source_url: str = Field(alias="sourceUrl")
    updated_at: str = Field(alias="updatedAt")
    dates: list[InstitutionalDate]


ANNUAL_CALENDAR_SOURCE = (
    "https://www.intec.edu.do/estudiantes/calendarios/calendario-anual"
)


def _annual_period(
    id_: str,
    title: str,
    starts_on: str,
    ends_on: str,
    dates: list[tuple[str, str, str, str] | tuple[str, str, str, str, str]],
) -> InstitutionalPeriod:
    entries = [
        InstitutionalDate(
            date=item[0],
            kind=item[1],
            title=item[2],
            detail=item[3],
            **({"endsOn": item[4]} if len(item) == 5 else {}),
        )
        for item in dates
    ]
    return InstitutionalPeriod(
        id=id_,
        title=title,
        startsOn=starts_on,
        endsOn=ends_on,
        timezone="America/Santo_Domingo",
        sourceUrl=ANNUAL_CALENDAR_SOURCE,
        updatedAt="2026-10-01T00:00:00-04:00",
        dates=entries,
    )


class GoogleCalendarService:
    API_ROOT = "https://www.googleapis.com/calendar/v3"
    CALENDAR_NAME = "AcademicPlanner"
    SOURCE_KEY = "academicPlannerSourceId"
    SOURCE_TYPE_KEY = "academicPlannerSourceType"

    def __init__(self, access_token: str, client: httpx.AsyncClient | None = None):
        self.access_token = access_token
        self.client = client

    async def list(self, from_: datetime, to: datetime) -> list[CalendarEvent]:
        calendar_id = await self._calendar_id()
        payload = await self._request(
            "GET",
            f"/calendars/{quote(calendar_id, safe='')}/events",
            params={
                "timeMin": from_.isoformat(),
                "timeMax": to.isoformat(),
                "singleEvents": "true",
                "orderBy": "startTime",
                "maxResults": "2500",
            },
        )
        return [
            self._to_event(item)
            for item in payload.get("items", [])
            if item.get("status") != "cancelled"
            and item.get("start", {}).get("dateTime")
        ]

    async def create(self, event: EventCreate) -> CalendarEvent:
        calendar_id = await self._calendar_id()
        existing = await self._request(
            "GET",
            f"/calendars/{quote(calendar_id, safe='')}/events",
            params={
                "privateExtendedProperty": f"{self.SOURCE_KEY}={event.source_id}",
                "maxResults": "1",
                "showDeleted": "false",
            },
        )
        if existing.get("items"):
            return self._to_event(existing["items"][0])
        payload = await self._request(
            "POST",
            f"/calendars/{quote(calendar_id, safe='')}/events",
            json=self._event_body(event),
        )
        return self._to_event(payload)

    async def update(self, event_id: str, changes: EventUpdate) -> CalendarEvent:
        calendar_id = await self._calendar_id()
        current = self._to_event(
            await self._request("GET", self._event_path(calendar_id, event_id))
        )
        values = current.model_dump(
            include={
                "title",
                "description",
                "start_at",
                "end_at",
                "timezone",
                "location",
                "source_id",
                "source_type",
                "reminder_minutes",
            }
        )
        values.update(changes.model_dump(exclude_unset=True))
        try:
            merged = EventCreate.model_validate(values)
        except ValidationError:
            raise ApiError("INVALID_EVENT_DATA") from None
        payload = await self._request(
            "PATCH",
            self._event_path(calendar_id, event_id),
            json=self._event_body(merged),
        )
        return self._to_event(payload)

    async def delete(self, event_id: str) -> None:
        calendar_id = await self._calendar_id()
        await self._request("GET", self._event_path(calendar_id, event_id))
        await self._request("DELETE", self._event_path(calendar_id, event_id))

    async def _calendar_id(self) -> str:
        payload = await self._request(
            "GET", "/users/me/calendarList", params={"maxResults": "250"}
        )
        for calendar in payload.get("items", []):
            if (
                calendar.get("summary") == self.CALENDAR_NAME
                and calendar.get("accessRole") == "owner"
            ):
                return str(calendar["id"])
        created = await self._request(
            "POST",
            "/calendars",
            json={
                "summary": self.CALENDAR_NAME,
                "timeZone": "America/Santo_Domingo",
            },
        )
        return str(created["id"])

    @staticmethod
    def _event_path(calendar_id: str, event_id: str) -> str:
        return f"/calendars/{quote(calendar_id, safe='')}/events/{quote(event_id, safe='')}"

    async def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        owns_client = self.client is None
        client = self.client or httpx.AsyncClient(timeout=15)
        try:
            response = await client.request(
                method,
                f"{self.API_ROOT}{path}",
                headers={"Authorization": f"Bearer {self.access_token}"},
                **kwargs,
            )
        except httpx.HTTPError:
            raise ApiError("GOOGLE_CALENDAR_UNAVAILABLE") from None
        finally:
            if owns_client:
                await client.aclose()
        if response.status_code == 401:
            raise ApiError("GOOGLE_CALENDAR_AUTH_REQUIRED")
        if response.status_code == 403:
            raise ApiError("GOOGLE_CALENDAR_PERMISSION_DENIED")
        if response.status_code == 404:
            raise ApiError("EVENT_NOT_FOUND")
        if response.status_code >= 400:
            raise ApiError("GOOGLE_CALENDAR_UNAVAILABLE")
        if response.status_code == 204 or not response.content:
            return {}
        try:
            return response.json()
        except ValueError:
            raise ApiError("GOOGLE_CALENDAR_UNAVAILABLE") from None

    @classmethod
    def _event_body(cls, event: EventCreate) -> dict[str, Any]:
        return {
            "summary": event.title,
            "description": event.description,
            "location": event.location,
            "start": {
                "dateTime": event.start_at.isoformat(),
                "timeZone": event.timezone,
            },
            "end": {"dateTime": event.end_at.isoformat(), "timeZone": event.timezone},
            "extendedProperties": {
                "private": {
                    cls.SOURCE_KEY: str(event.source_id),
                    cls.SOURCE_TYPE_KEY: event.source_type,
                }
            },
            "reminders": (
                {
                    "useDefault": False,
                    "overrides": [
                        {"method": "popup", "minutes": event.reminder_minutes},
                    ],
                }
                if event.reminder_minutes is not None
                else {"useDefault": False, "overrides": []}
            ),
        }

    @classmethod
    def _to_event(cls, payload: dict[str, Any]) -> CalendarEvent:
        private = payload.get("extendedProperties", {}).get("private", {})
        source_id = private.get(cls.SOURCE_KEY) or str(
            uuid5(NAMESPACE_URL, f"google-calendar:{payload.get('id')}")
        )
        source_type = private.get(cls.SOURCE_TYPE_KEY) or "google"
        if source_type not in {"personal", "schedule", "institutional", "google"}:
            source_type = "google"
        reminder = next(
            (
                item.get("minutes")
                for item in payload.get("reminders", {}).get("overrides", [])
                if item.get("method") in {"popup", "notification"}
                and isinstance(item.get("minutes"), int)
            ),
            None,
        )
        try:
            return CalendarEvent(
                id=payload["id"],
                title=payload.get("summary") or "Sin título",
                description=payload.get("description"),
                startAt=payload["start"]["dateTime"],
                endAt=payload["end"]["dateTime"],
                timezone=payload["start"].get("timeZone") or "America/Santo_Domingo",
                location=payload.get("location"),
                sourceId=source_id,
                sourceType=source_type,
                reminderMinutes=reminder,
                createdAt=payload["created"],
                updatedAt=payload["updated"],
                revision=payload.get("sequence", 0),
                htmlLink=payload.get("htmlLink"),
            )
        except (KeyError, TypeError, ValidationError):
            raise ApiError("GOOGLE_CALENDAR_UNAVAILABLE") from None


router = APIRouter()
google_bearer = HTTPBearer(auto_error=False)


async def get_google_service(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(google_bearer)],
):
    if (
        credentials is None
        or credentials.scheme.lower() != "bearer"
        or len(credentials.credentials) > 4096
    ):
        raise ApiError("GOOGLE_CALENDAR_AUTH_REQUIRED")
    return GoogleCalendarService(credentials.credentials)


@router.get(
    "/calendar/config",
    response_model=GoogleCalendarConfig,
    response_model_by_alias=True,
)
async def calendar_config():
    client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
    return GoogleCalendarConfig(
        available=bool(client_id),
        clientId=client_id,
        scopes=[
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/calendar.calendars",
            "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
        ],
        calendarName="AcademicPlanner",
    )


@router.get(
    "/calendar/institutional",
    response_model=list[InstitutionalPeriod],
    response_model_by_alias=True,
    response_model_exclude_none=True,
)
async def institutional_calendar():
    return [
        InstitutionalPeriod(
            id="2026-T3",
            title="Trimestre agosto–octubre 2026",
            startsOn="2026-08-03",
            endsOn="2026-10-17",
            timezone="America/Santo_Domingo",
            sourceUrl=ANNUAL_CALENDAR_SOURCE,
            updatedAt="2026-10-01T00:00:00-04:00",
            dates=[
                InstitutionalDate(
                    date="2026-08-03",
                    kind="milestone",
                    title="Inicio de docencia",
                    detail="Inicio oficial del trimestre agosto–octubre 2026.",
                ),
                InstitutionalDate(
                    date="2026-08-06",
                    kind="milestone",
                    title="Inicia la selección tardía y modificación",
                    detail="Disponible en línea y en las áreas académicas hasta el 7 de agosto.",
                ),
                InstitutionalDate(
                    date="2026-08-07",
                    kind="milestone",
                    title="Fecha límite para solicitar tutorías",
                    detail="Último día para que las áreas remitan las solicitudes a Registro.",
                ),
                InstitutionalDate(
                    date="2026-08-10",
                    kind="milestone",
                    title="Inicia el retiro de asignaturas",
                    detail="El retiro está disponible únicamente en línea hasta el 3 de octubre.",
                ),
                InstitutionalDate(
                    date="2026-08-16",
                    kind="no_class",
                    title="Día de la Restauración",
                    detail="No hay actividades académicas por el feriado nacional.",
                ),
                InstitutionalDate(
                    date="2026-08-31",
                    kind="milestone",
                    title="Inician las evaluaciones de medio término",
                    detail="El período de evaluaciones finaliza el 5 de septiembre.",
                ),
                InstitutionalDate(
                    date="2026-09-24",
                    kind="no_class",
                    title="Día de Nuestra Señora de las Mercedes",
                    detail="No hay actividades académicas por el feriado nacional.",
                ),
                InstitutionalDate(
                    date="2026-09-26",
                    kind="milestone",
                    title="Fecha límite para calificaciones de medio término",
                    detail="Último día para reportar las calificaciones de medio término.",
                ),
                InstitutionalDate(
                    date="2026-10-02",
                    kind="milestone",
                    title="Finaliza el período para solicitar grado",
                    detail="Fecha límite para la graduación de abril de 2027.",
                ),
                InstitutionalDate(
                    date="2026-10-03",
                    kind="milestone",
                    title="Último día para retirar asignaturas",
                    detail="El retiro está disponible únicamente en línea.",
                ),
                InstitutionalDate(
                    date="2026-10-06",
                    kind="milestone",
                    title="Inicia la preselección de asignaturas",
                    detail="La preselección para el próximo trimestre está disponible en línea.",
                ),
                InstitutionalDate(
                    date="2026-10-09",
                    kind="milestone",
                    title="Fecha límite para solicitar reingreso",
                    detail="Aplica al trimestre noviembre 2026–enero 2027.",
                ),
                InstitutionalDate(
                    date="2026-10-10",
                    kind="milestone",
                    title="Ceremonia de graduación",
                    detail="Actividad institucional sujeta a cambio.",
                ),
                InstitutionalDate(
                    date="2026-10-12",
                    kind="milestone",
                    title="Última semana de docencia",
                    detail="Última semana de docencia y evaluaciones finales.",
                ),
                InstitutionalDate(
                    date="2026-10-17",
                    kind="milestone",
                    title="Finaliza la docencia",
                    detail="El próximo período se mostrará cuando INTEC publique su calendario.",
                ),
            ],
        ),
        _annual_period(
            "2026-T4",
            "Trimestre noviembre 2026–enero 2027",
            "2026-11-02",
            "2027-01-23",
            [
                (
                    "2026-10-20",
                    "milestone",
                    "Selección de nuevo ingreso",
                    "Selección de asignaturas para estudiantes de grado.",
                ),
                (
                    "2026-10-22",
                    "milestone",
                    "Selección de posgrado",
                    "Selección de asignaturas para estudiantes de posgrado.",
                ),
                (
                    "2026-10-27",
                    "milestone",
                    "Selección de estudiantes activos",
                    "Disponible en línea hasta el 29 de octubre.",
                ),
                (
                    "2026-11-02",
                    "milestone",
                    "Inicio de docencia",
                    "Inicio oficial del trimestre.",
                ),
                (
                    "2026-11-09",
                    "no_class",
                    "Día de la Constitución",
                    "No hay actividades académicas por el feriado trasladado.",
                ),
                (
                    "2026-11-30",
                    "milestone",
                    "Evaluaciones de medio término",
                    "Finalizan el 5 de diciembre.",
                ),
                (
                    "2026-12-24",
                    "no_class",
                    "Asueto de Navidad",
                    "No hay actividades académicas del 24 de diciembre al 3 de enero.",
                    "2027-01-03",
                ),
                (
                    "2027-01-04",
                    "no_class",
                    "Día de los Santos Reyes",
                    "No hay actividades académicas por el feriado trasladado.",
                ),
                (
                    "2027-01-18",
                    "milestone",
                    "Última semana de docencia",
                    "Docencia y evaluaciones finales hasta el 23 de enero.",
                ),
                (
                    "2027-01-23",
                    "milestone",
                    "Finaliza la docencia",
                    "Último día del trimestre.",
                ),
                (
                    "2027-01-25",
                    "no_class",
                    "Natalicio de Juan Pablo Duarte",
                    "No hay actividades académicas por el feriado trasladado.",
                ),
                (
                    "2027-01-26",
                    "milestone",
                    "Calificaciones finales",
                    "Fecha límite de entrega para el trimestre.",
                ),
            ],
        ),
        _annual_period(
            "2027-T1",
            "Trimestre febrero–abril 2027",
            "2027-02-01",
            "2027-04-24",
            [
                (
                    "2027-01-12",
                    "milestone",
                    "Preselección de asignaturas",
                    "Disponible en línea hasta el 18 de enero.",
                ),
                (
                    "2027-01-19",
                    "milestone",
                    "Selección de nuevo ingreso",
                    "Selección de asignaturas para estudiantes de grado.",
                ),
                (
                    "2027-02-01",
                    "milestone",
                    "Inicio de docencia",
                    "Inicio oficial del trimestre.",
                ),
                (
                    "2027-02-27",
                    "no_class",
                    "Día de la Independencia Nacional",
                    "No hay actividades académicas por el feriado nacional.",
                ),
                (
                    "2027-03-01",
                    "milestone",
                    "Evaluaciones de medio término",
                    "Período institucional de evaluaciones.",
                ),
                (
                    "2027-03-21",
                    "no_class",
                    "Asueto de Semana Santa",
                    "No hay actividades académicas del 21 al 28 de marzo.",
                    "2027-03-28",
                ),
                (
                    "2027-04-09",
                    "milestone",
                    "Fecha límite para solicitar grado",
                    "Aplica a la graduación de octubre de 2027.",
                ),
                (
                    "2027-04-10",
                    "milestone",
                    "Último día para retirar asignaturas",
                    "El retiro está disponible únicamente en línea.",
                ),
                (
                    "2027-04-17",
                    "milestone",
                    "Ceremonia de graduación",
                    "Actividad institucional sujeta a cambio.",
                ),
                (
                    "2027-04-19",
                    "milestone",
                    "Última semana de docencia",
                    "Docencia y evaluaciones finales hasta el 24 de abril.",
                ),
                (
                    "2027-04-24",
                    "milestone",
                    "Finaliza la docencia",
                    "Último día del trimestre.",
                ),
                (
                    "2027-04-27",
                    "milestone",
                    "Calificaciones finales",
                    "Fecha límite de entrega para el trimestre.",
                ),
            ],
        ),
        _annual_period(
            "2027-T2",
            "Trimestre mayo–julio 2027",
            "2027-05-03",
            "2027-07-17",
            [
                (
                    "2027-04-13",
                    "milestone",
                    "Preselección de asignaturas",
                    "Disponible en línea hasta el 19 de abril.",
                ),
                (
                    "2027-04-20",
                    "milestone",
                    "Selección de nuevo ingreso",
                    "Selección de asignaturas para estudiantes de grado.",
                ),
                (
                    "2027-04-30",
                    "no_class",
                    "Día del Trabajo",
                    "No hay actividades académicas por el feriado trasladado.",
                ),
                (
                    "2027-05-03",
                    "milestone",
                    "Inicio de docencia",
                    "Inicio oficial del trimestre.",
                ),
                (
                    "2027-05-27",
                    "no_class",
                    "Corpus Christi",
                    "No hay actividades académicas por el feriado nacional.",
                ),
                (
                    "2027-05-31",
                    "milestone",
                    "Evaluaciones de medio término",
                    "Finalizan el 5 de junio.",
                ),
                (
                    "2027-07-02",
                    "milestone",
                    "Fecha límite para solicitar grado",
                    "Aplica a la graduación de octubre de 2027.",
                ),
                (
                    "2027-07-03",
                    "milestone",
                    "Último día para retirar asignaturas",
                    "El retiro está disponible únicamente en línea.",
                ),
                (
                    "2027-07-12",
                    "milestone",
                    "Última semana de docencia",
                    "Docencia y evaluaciones finales hasta el 17 de julio.",
                ),
                (
                    "2027-07-17",
                    "milestone",
                    "Finaliza la docencia",
                    "Último día del trimestre.",
                ),
                (
                    "2027-07-20",
                    "milestone",
                    "Calificaciones finales",
                    "Fecha límite de entrega para el trimestre.",
                ),
            ],
        ),
    ]


@router.get("/events", response_model=list[CalendarEvent], response_model_by_alias=True)
async def list_events(
    from_: Annotated[datetime, Query(alias="from")],
    to: Annotated[datetime, Query()],
    service: Annotated[GoogleCalendarService, Depends(get_google_service)],
):
    if from_.tzinfo is None or to.tzinfo is None or to <= from_:
        raise ApiError("INVALID_EVENT_RANGE")
    return await service.list(from_, to)


@router.post(
    "/events",
    response_model=CalendarEvent,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
)
async def create_event(
    body: EventCreate,
    service: Annotated[GoogleCalendarService, Depends(get_google_service)],
):
    return await service.create(body)


@router.patch(
    "/events/{event_id}", response_model=CalendarEvent, response_model_by_alias=True
)
async def update_event(
    event_id: str,
    body: EventUpdate,
    service: Annotated[GoogleCalendarService, Depends(get_google_service)],
):
    return await service.update(event_id, body)


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: str,
    service: Annotated[GoogleCalendarService, Depends(get_google_service)],
):
    await service.delete(event_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
