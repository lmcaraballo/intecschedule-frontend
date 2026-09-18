import asyncio
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from app.errors import ApiError
from app.main import create_app
from app.models import LoginRequest, ScheduleResponse, Student
from app.sessions import SessionStore
from app.portal import portal_url

class Portal:
    def __init__(self, error=None):
        self.closed=False
        self.error=error
    async def close(self):
        self.closed=True
    async def schedule(self, student):
        if self.error:
            raise ApiError(self.error)
        return ScheduleResponse(student=Student(id=student),fetchedAt=datetime.now(timezone.utc),classes=[])

class Provider:
    def __init__(self, error=None):
        self.sessions=[]
        self.error=error
        self.calls=[]
    async def login(self, student, password):
        self.calls.append(student)
        assert password == ' fake password '
        portal=Portal(self.error)
        self.sessions.append(portal)
        return portal


def test_login_schedule_and_single_use():
    provider=Provider()
    with TestClient(create_app(provider)) as client:
        r=client.post('/user/login',json={'studentId':' 1234567@EST.INTEC.EDU.DO ','password':' fake password '})
        assert r.status_code==200
        assert provider.calls==['1234567']
        tokens=r.json()
        headers={'Authorization':'Bearer '+tokens['accessToken']}
        r=client.post('/schedule',headers=headers)
        assert r.status_code==200
        assert r.json()['student']['id']=='1234567'
        assert r.json()['classes']==[]
        assert r.headers['cache-control']=='no-store'
        assert provider.sessions[0].closed
        assert client.post('/schedule',headers=headers).status_code==401
        assert client.post('/user/refresh-token',json={'refreshToken':tokens['refreshToken']}).status_code==401

@pytest.mark.parametrize('payload', [{}, {'studentId':'x@gmail.com','password':'sensitive'},
 {'studentId':'1','password':'   '}, {'studentId':'1','password':'secret','extra':'sensitive'}])
def test_validation_does_not_echo_secrets(payload):
    with TestClient(create_app(Provider())) as client:
        r=client.post('/user/login',json=payload)
        assert r.status_code==422
        assert r.json()['error']['code']=='INVALID_REQUEST'
        assert 'sensitive' not in r.text and 'secret' not in r.text

@pytest.mark.parametrize('code',['PORTAL_STRUCTURE_CHANGED','PORTAL_UNAVAILABLE','SCHEDULE_NOT_FOUND'])
def test_failure_closes_session(code):
    provider=Provider(code)
    with TestClient(create_app(provider)) as client:
        token=client.post('/user/login',json={'studentId':'1','password':' fake password '}).json()['accessToken']
        r=client.post('/schedule',headers={'Authorization':'Bearer '+token})
        assert r.json()['error']['code']==code
        assert provider.sessions[0].closed

@pytest.mark.asyncio
async def test_refresh_rotation_expiry_and_no_raw_tokens_in_store():
    now=[0]
    store=SessionStore(ttl=10,clock=lambda:now[0])
    portal=Portal()
    tokens=store.add('1',portal)
    assert tokens.accessToken not in store.access
    new=await store.rotate(tokens.refreshToken)
    with pytest.raises(ApiError): await store.take(tokens.accessToken)
    with pytest.raises(ApiError): await store.rotate(tokens.refreshToken)
    now[0]=11
    with pytest.raises(ApiError): await store.take(new.accessToken)
    assert portal.closed
    assert not store.access and not store.refresh

@pytest.mark.asyncio
async def test_cleanup_and_capacity():
    now=[0];store=SessionStore(ttl=10,capacity=1,clock=lambda:now[0]);portal=Portal()
    store.add('1',portal)
    with pytest.raises(ApiError): store.add('2',Portal())
    now[0]=11;await store.cleanup()
    assert portal.closed and not store.access


def test_bounded_requests_and_rate_limit():
    provider=Provider()
    with TestClient(create_app(provider)) as client:
        assert client.post('/user/login',content='x'*5000).status_code==422
        for _ in range(8):
            assert client.post('/user/login',json={'studentId':'1','password':' fake password '}).status_code==200
        assert client.post('/user/login',json={'studentId':'1','password':' fake password '}).status_code==429
        assert client.post('/schedule').status_code==401
        assert client.get('/health').json()=={'status':'ok'}
    assert all(p.closed for p in provider.sessions)

@pytest.mark.parametrize('url',['https://evil.example/','http://beecampus.intec.edu.do/','https://beecampus.intec.edu.do.evil/','https://user@beecampus.intec.edu.do/','https://beecampus.intec.edu.do:444/'])
def test_portal_redirects_stay_on_verified_origin(url):
    with pytest.raises(ApiError):portal_url('https://beecampus.intec.edu.do/',url)
