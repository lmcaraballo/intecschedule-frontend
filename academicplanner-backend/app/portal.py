"""Read-only BeeCampus connector. Form state is retained only in the isolated HTTP client."""
import ssl
import os
import re
from pathlib import Path
from urllib.parse import urljoin, urlparse, parse_qs
import httpx
from bs4 import BeautifulSoup
from .errors import ApiError
from .parser import parse_selection

ORIGIN = 'https://beecampus.intec.edu.do'
LOGIN_URL = ORIGIN + '/psp/cs92pro/?cmd=login'
REPORT_URL = ORIGIN + '/psp/cs92pro_14/EMPLOYEE/SA/q/?ICAction=ICQryNameURL=PUBLIC.CX_RE_VOL_SEL_ESTUDIANTE&pslnkid=ADMN_S202601131057539319535721'


def portal_url(base, target):
    value = urljoin(base, target)
    parsed = urlparse(value)
    if parsed.scheme != 'https' or parsed.hostname != 'beecampus.intec.edu.do' or parsed.port not in (None, 443) or parsed.username or parsed.password:
        raise ApiError('PORTAL_STRUCTURE_CHANGED')
    return value


def tls_context():
    ctx = ssl.create_default_context()
    ctx.load_verify_locations(Path(__file__).resolve().parent.parent / 'certs/intec-intermediates.pem')
    return ctx


class PortalSession:
    def __init__(self, client, term=None):
        self.client = client
        self.term = term

    async def _send(self, method, url, **kwargs):
        async with self.client.stream(method, url, **kwargs) as incoming:
            chunks, size = [], 0
            async for chunk in incoming.aiter_bytes():
                size += len(chunk)
                if size > 4_000_000:
                    raise ApiError('PORTAL_STRUCTURE_CHANGED')
                chunks.append(chunk)
            # aiter_bytes already decoded gzip/deflate. Do not decode the payload again.
            headers = {key: value for key, value in incoming.headers.items()
                       if key.lower() not in ('content-encoding', 'content-length', 'transfer-encoding')}
            return httpx.Response(incoming.status_code, headers=headers,
                content=b''.join(chunks), request=incoming.request)

    async def request(self, method, url, **kwargs):
        url = portal_url(ORIGIN, url)
        try:
            response = await self._send(method, url, **kwargs)
            for _ in range(6):
                if not response.is_redirect:
                    break
                # Never forward credentials on a POST redirect.
                if response.status_code in (307, 308) and method != 'GET':
                    raise ApiError('PORTAL_STRUCTURE_CHANGED')
                url = portal_url(str(response.url), response.headers.get('location', ''))
                response = await self._send('GET', url)
            else:
                raise ApiError('PORTAL_UNAVAILABLE')
            if response.status_code >= 500:
                raise ApiError('PORTAL_UNAVAILABLE')
            if response.status_code != 200 or len(response.content) > 4_000_000:
                raise ApiError('PORTAL_STRUCTURE_CHANGED')
            return response
        except httpx.HTTPError:
            raise ApiError('PORTAL_UNAVAILABLE') from None

    async def schedule(self, student_id):
        response = await self.request('GET', REPORT_URL)
        soup = BeautifulSoup(response.text, 'html.parser')
        frame = soup.select_one('iframe#ptifrmtgtframe')
        if frame and frame.get('src'):
            response = await self.request('GET', portal_url(str(response.url), frame['src']))
        soup = BeautifulSoup(response.text, 'html.parser')
        prompt = soup.find('input', attrs={'name': 'InputKeys_STRM'})
        if prompt is not None:
            term = self.term or prompt.get('value', '')
            if not re.fullmatch(r'\d{4}', term):
                raise ApiError('SERVICE_NOT_CONFIGURED')
            form = prompt.find_parent('form')
            if form is None or form.find(id='#ICOK') is None:
                raise ApiError('PORTAL_STRUCTURE_CHANGED')
            target = portal_url(str(response.url), form.get('action', ''))
            target_parts = urlparse(target)
            if not target_parts.path.endswith('/q/') or parse_qs(target_parts.query).get('ICQryName') != ['CX_RE_VOL_SEL_ESTUDIANTE']:
                raise ApiError('PORTAL_STRUCTURE_CHANGED')
            data = {item['name']: item.get('value', '') for item in form.select('input[name]')
                    if item.get('type', '').lower() in ('hidden', 'text')}
            data.update(InputKeys_STRM=term, InputKeys_ACAD_PROG='', ICAction='#ICOK')
            try:
                response = await self.request('POST', target, data=data)
            finally:
                data.clear()
        return parse_selection(response.text, student_id)

    async def close(self):
        self.client.cookies.clear()
        await self.client.aclose()


class BeeCampusProvider:
    async def login(self, student_id, password):
        session = PortalSession(httpx.AsyncClient(verify=tls_context(), timeout=12, follow_redirects=False,
            headers={'User-Agent':'AcademicPlanner/0.1', 'Accept':'text/html'}, trust_env=False), term=os.environ.get('ACADEMIC_TERM'))
        transferred = False
        try:
            response = await session.request('GET', LOGIN_URL)
            soup = BeautifulSoup(response.text, 'html.parser')
            form = soup.find('form')
            if not form or not form.select_one('input[name="userid"]') or not form.select_one('input[name="pwd"]'):
                raise ApiError('PORTAL_STRUCTURE_CHANGED')
            data = {item['name']: item.get('value','') for item in form.select('input[type="hidden"][name]')}
            data.update(userid=student_id, pwd=password, Submit='Iniciar sesión')
            try:
                response = await session.request('POST', portal_url(str(response.url), form.get('action','')), data=data)
            finally:
                data.clear()
                password = ''
            soup = BeautifulSoup(response.text, 'html.parser')
            if soup.select_one('input[type="password"]'):
                raise ApiError('INVALID_CREDENTIALS')
            if not any(cookie.name == 'PS_TOKEN' for cookie in session.client.cookies.jar):
                raise ApiError('PORTAL_STRUCTURE_CHANGED')
            transferred = True
            return session
        finally:
            if not transferred:
                await session.close()
