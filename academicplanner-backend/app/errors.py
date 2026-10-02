MESSAGES = {
    "INVALID_CREDENTIALS": (401, "Revisa tu identificación o contraseña."),
    "AUTHENTICATION_REQUIRED": (401, "Vuelve a iniciar la consulta."),
    "PORTAL_UNAVAILABLE": (503, "El portal no está disponible en este momento."),
    "PORTAL_STRUCTURE_CHANGED": (502, "No pudimos interpretar el horario del portal."),
    "SCHEDULE_NOT_FOUND": (404, "No encontramos un horario disponible."),
    "RATE_LIMITED": (429, "Espera un momento antes de volver a consultar."),
    "SERVICE_NOT_CONFIGURED": (
        503,
        "La consulta de este período aún no está configurada.",
    ),
    "INVALID_REQUEST": (422, "Revisa los datos enviados."),
    "INVALID_EVENT_RANGE": (422, "El rango de fechas no es válido."),
    "INVALID_EVENT_DATA": (422, "Revisa los datos del evento."),
    "EVENT_NOT_FOUND": (404, "No encontramos el evento solicitado."),
    "GOOGLE_CALENDAR_AUTH_REQUIRED": (401, "Conecta Google Calendar para continuar."),
    "GOOGLE_CALENDAR_PERMISSION_DENIED": (
        403,
        "Google no concedió los permisos necesarios.",
    ),
    "GOOGLE_CALENDAR_UNAVAILABLE": (
        502,
        "Google Calendar no está disponible en este momento.",
    ),
    "UNKNOWN_ERROR": (500, "No pudimos completar la consulta."),
}


class ApiError(Exception):
    def __init__(self, code: str):
        self.code = code
        self.status, self.message = MESSAGES[code]
        super().__init__(code)
