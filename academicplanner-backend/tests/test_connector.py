import httpx
import pytest
from app.portal import PortalSession
from app.errors import ApiError

@pytest.mark.asyncio
async def test_cross_origin_redirect_never_receives_request():
    calls=[]
    async def handler(request):
        calls.append(request.url.host)
        return httpx.Response(302,headers={'Location':'https://evil.example/'})
    client=httpx.AsyncClient(transport=httpx.MockTransport(handler))
    portal=PortalSession(client)
    with pytest.raises(ApiError):await portal.request('GET','https://beecampus.intec.edu.do/start')
    assert calls==['beecampus.intec.edu.do']
    await portal.close()

@pytest.mark.asyncio
async def test_credentials_are_not_replayed_on_307():
    calls=[]
    async def handler(request):
        calls.append(request)
        return httpx.Response(307,headers={'Location':'/other'})
    client=httpx.AsyncClient(transport=httpx.MockTransport(handler))
    portal=PortalSession(client)
    with pytest.raises(ApiError):await portal.request('POST','https://beecampus.intec.edu.do/start',data={'pwd':'fake'})
    assert len(calls)==1
    await portal.close()

@pytest.mark.asyncio
async def test_upstream_failure_and_cleanup():
    client=httpx.AsyncClient(transport=httpx.MockTransport(lambda request:httpx.Response(503)))
    client.cookies.set('PS_TOKEN','fake')
    portal=PortalSession(client)
    with pytest.raises(ApiError,match='PORTAL_UNAVAILABLE'):await portal.request('GET','https://beecampus.intec.edu.do/')
    await portal.close()
    assert client.is_closed and not list(client.cookies.jar)

@pytest.mark.asyncio
async def test_compressed_portal_html_is_decoded_only_once():
    import gzip
    html=b'<html><form><input name="userid"></form></html>'
    def handler(request):
        return httpx.Response(200,headers={'Content-Encoding':'gzip','Content-Type':'text/html'},content=gzip.compress(html))
    client=httpx.AsyncClient(transport=httpx.MockTransport(handler))
    portal=PortalSession(client)
    try:
        response=await portal.request('GET','https://beecampus.intec.edu.do/')
        assert response.content==html
    finally:
        await portal.close()

PROMPT = '''<form method="post" action="/psc/cs92pro_14/EMPLOYEE/SA/q/?ICQryName=CX_RE_VOL_SEL_ESTUDIANTE">
<input type="hidden" name="ICSID" value="fictional-form-state">
<input type="hidden" name="ICAction" value="">
<input type="text" name="InputKeys_STRM" value="">
<input type="text" name="InputKeys_ACAD_PROG" value="">
<input type="button" id="#ICOK" value="Ver Resultado"></form>'''

@pytest.mark.asyncio
async def test_schedule_submits_term_and_preserves_form_state():
    from urllib.parse import parse_qs
    from .test_parser import html
    requests=[]
    def handler(request):
        requests.append(request.method)
        if request.method=='GET':return httpx.Response(200,text=PROMPT)
        body=parse_qs(request.content.decode(),keep_blank_values=True)
        assert body['InputKeys_STRM']==['2230']
        assert body['ICAction']==['#ICOK']
        assert body['ICSID']==['fictional-form-state']
        assert body['InputKeys_ACAD_PROG']==['']
        return httpx.Response(200,text=html())
    portal=PortalSession(httpx.AsyncClient(transport=httpx.MockTransport(handler)),term='2230')
    result=await portal.schedule('1234567')
    assert len(result.classes)==2 and requests==['GET','POST']
    await portal.close()

@pytest.mark.asyncio
async def test_missing_term_is_configuration_error_not_empty_schedule():
    requests=[]
    def handler(request):
        requests.append(request.method);return httpx.Response(200,text=PROMPT)
    portal=PortalSession(httpx.AsyncClient(transport=httpx.MockTransport(handler)))
    with pytest.raises(ApiError,match='SERVICE_NOT_CONFIGURED'):await portal.schedule('1234567')
    assert requests==['GET']
    await portal.close()

@pytest.mark.asyncio
async def test_unexpected_report_action_is_never_submitted():
    requests=[]
    def handler(request):
        requests.append(request.method)
        return httpx.Response(200,text=PROMPT.replace('CX_RE_VOL_SEL_ESTUDIANTE','UNEXPECTED_QUERY'))
    portal=PortalSession(httpx.AsyncClient(transport=httpx.MockTransport(handler)),term='2230')
    with pytest.raises(ApiError):await portal.schedule('1234567')
    assert requests==['GET']
    await portal.close()
