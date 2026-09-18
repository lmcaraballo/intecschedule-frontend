MESSAGES = {
    'INVALID_CREDENTIALS': (401, 'Revisa tu identificación o contraseña.'),
    'AUTHENTICATION_REQUIRED': (401, 'Vuelve a iniciar la consulta.'),
    'PORTAL_UNAVAILABLE': (503, 'El portal no está disponible en este momento.'),
    'PORTAL_STRUCTURE_CHANGED': (502, 'No pudimos interpretar el horario del portal.'),
    'SCHEDULE_NOT_FOUND': (404, 'No encontramos un horario disponible.'),
    'RATE_LIMITED': (429, 'Espera un momento antes de volver a consultar.'),
    'SERVICE_NOT_CONFIGURED': (503, 'La consulta de este período aún no está configurada.'),
    'INVALID_REQUEST': (422, 'Revisa los datos enviados.'),
    'UNKNOWN_ERROR': (500, 'No pudimos completar la consulta.'),
}

class ApiError(Exception):
    def __init__(self, code: str):
        self.code = code
        self.status, self.message = MESSAGES[code]
        super().__init__(code)
