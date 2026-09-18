"""Parse the selection report by semantic column names, never by fixed cell positions."""
import hashlib
import re
import unicodedata
from datetime import datetime, timezone
from bs4 import BeautifulSoup
from pydantic import ValidationError
from .errors import ApiError
from .models import AcademicClass, ScheduleResponse, Student


def clean(value):
    return re.sub(r'\s+', ' ', value).strip()


def normalized(value):
    value = unicodedata.normalize('NFKD', clean(value)).encode('ascii', 'ignore').decode().upper()
    return re.sub(r'[^A-Z0-9]', '', value)


DAYS = {1: ('LUN', 'LUNES'), 2: ('MAR', 'MARTES'), 3: ('MIERC', 'MIE', 'MIERCOLES'),
        4: ('JUE', 'JUEVES'), 5: ('VIER', 'VIE', 'VIERNES'), 6: ('SAB', 'SABADO'), 7: ('DOM', 'DOMINGO')}
INTERVAL = re.compile(r'(\d{1,2}:\d{2})\s*(AM|PM)?\s*[-–—]\s*(\d{1,2}:\d{2})\s*(AM|PM)?', re.I)


def clock(value, meridiem=None):
    hours, minutes = map(int, value.split(':'))
    if not 0 <= minutes < 60 or not 0 <= hours < 24:
        raise ApiError('PORTAL_STRUCTURE_CHANGED')
    if meridiem:
        if not 1 <= hours <= 12:
            raise ApiError('PORTAL_STRUCTURE_CHANGED')
        hours = hours % 12 + (12 if meridiem.upper() == 'PM' else 0)
    return f'{hours:02}:{minutes:02}'


def intervals(cell):
    text = clean(cell.get_text(' ', strip=True))
    if text in ('', '-', '—'):
        return []
    matches = list(INTERVAL.finditer(text))
    remainder = INTERVAL.sub('', text).strip(' ,;/')
    if not matches or remainder:
        raise ApiError('PORTAL_STRUCTURE_CHANGED')
    result = [(clock(m[1], m[2]), clock(m[3], m[4])) for m in matches]
    if any(start >= end for start, end in result):
        raise ApiError('PORTAL_STRUCTURE_CHANGED')
    return result


def parse_selection(html: str, student_id: str, fetched_at=None) -> ScheduleResponse:
    soup = BeautifulSoup(html, 'html.parser')
    if soup.select('input[type="password"]'):
        raise ApiError('AUTHENTICATION_REQUIRED')
    candidates = []
    for row in soup.find_all('tr'):
        cells = row.find_all(['th', 'td'], recursive=False)
        labels = [normalized(c.get_text(' ', strip=True)) for c in cells]
        if {'CLAVE', 'ASIGNATURA', 'SECCION', 'ID'}.issubset(labels):
            candidates.append((row, labels))
    if len(candidates) != 1:
        raise ApiError('PORTAL_STRUCTURE_CHANGED')
    header, labels = candidates[0]
    columns = {name: labels.index(name) for name in ('CLAVE', 'ASIGNATURA', 'SECCION', 'ID')}
    for optional in ('PROFESOR', 'AULA'):
        if optional in labels:
            columns[optional] = labels.index(optional)
    days = {}
    for day, aliases in DAYS.items():
        indexes = [i for i, name in enumerate(labels) if name in aliases]
        if len(indexes) != 1:
            raise ApiError('PORTAL_STRUCTURE_CHANGED')
        days[day] = indexes[0]
    table = header.find_parent('table')
    rows = [r for r in table.find_all('tr') if r.find_parent('table') is table]
    rows = rows[rows.index(header)+1:]
    classes, found_rows = [], 0
    for row in rows:
        cells = row.find_all(['th', 'td'], recursive=False)
        if not cells:
            continue
        if len(cells) != len(labels):
            raise ApiError('PORTAL_STRUCTURE_CHANGED')
        def value(key):
            return clean(cells[columns[key]].get_text(' ', strip=True)) if key in columns else ''
        if value('ID') != student_id:
            raise ApiError('PORTAL_STRUCTURE_CHANGED')
        found_rows += 1
        code = re.sub(r'\s+', '', value('CLAVE'))
        name, section = value('ASIGNATURA'), value('SECCION')
        if not code or not name or not section:
            raise ApiError('PORTAL_STRUCTURE_CHANGED')
        row_count = 0
        for day, index in days.items():
            for start, end in intervals(cells[index]):
                identity = '|'.join([student_id, code, section, str(day), start, end])
                classes.append(AcademicClass(id=hashlib.sha256(identity.encode()).hexdigest()[:16],
                    subjectCode=code, subjectName=name, section=section, professor=value('PROFESOR'),
                    day=day, startTime=start, endTime=end, location=value('AULA')))
                row_count += 1
        if not row_count:
            # The current frontend cannot represent an enrolled course without a weekly time.
            raise ApiError('PORTAL_STRUCTURE_CHANGED')
    for first, last, total in re.findall(r'\b(\d+)\s*-\s*(\d+)\s+de\s+(\d+)\b', soup.get_text(' ', strip=True), re.I):
        if int(first) != 1 or int(last) != int(total) or int(total) != found_rows:
            raise ApiError('PORTAL_STRUCTURE_CHANGED')
    if not found_rows:
        # A missing/empty table is not enough evidence of a genuinely empty schedule.
        raise ApiError('SCHEDULE_NOT_FOUND')
    try:
        return ScheduleResponse(student=Student(id=student_id),
            fetchedAt=fetched_at or datetime.now(timezone.utc),
            classes=sorted(classes, key=lambda item: (item.day, item.startTime, item.subjectCode)))
    except ValidationError:
        raise ApiError('PORTAL_STRUCTURE_CHANGED') from None
