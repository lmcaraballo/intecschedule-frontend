import re
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator, model_validator

class LoginRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    studentId: str = Field(min_length=1, max_length=100)
    password: SecretStr = Field(min_length=1, max_length=256)

    @field_validator('studentId')
    @classmethod
    def normalize_student(cls, value):
        value = value.strip()
        match = re.fullmatch(r'(\d+)@est\.intec\.edu\.do', value, re.I)
        if match:
            value = match[1]
        if not re.fullmatch(r'\d{1,64}', value):
            raise ValueError('Invalid student identifier')
        return value

    @field_validator('password')
    @classmethod
    def nonblank_password(cls, value):
        if not value.get_secret_value().strip():
            raise ValueError('Password required')
        return value

class RefreshRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    refreshToken: SecretStr = Field(min_length=1, max_length=512)

class Student(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    isPino: bool = False

class AcademicClass(BaseModel):
    id: str = Field(min_length=1)
    subjectCode: str = Field(min_length=1)
    subjectName: str = Field(min_length=1)
    section: str
    professor: str = ''
    day: int = Field(ge=1, le=7, strict=True)
    startTime: str = Field(pattern=r'^([01]\d|2[0-3]):[0-5]\d$')
    endTime: str = Field(pattern=r'^([01]\d|2[0-3]):[0-5]\d$')
    location: str = ''

    @model_validator(mode='after')
    def valid_interval(self):
        if self.startTime >= self.endTime:
            raise ValueError('Invalid time interval')
        return self

class ScheduleResponse(BaseModel):
    student: Student
    fetchedAt: datetime
    classes: list[AcademicClass]

    @model_validator(mode='after')
    def valid_schedule(self):
        if self.fetchedAt.tzinfo is None:
            raise ValueError('Timezone required')
        if len({item.id for item in self.classes}) != len(self.classes):
            raise ValueError('Duplicate class IDs')
        return self

class TokenResponse(BaseModel):
    accessToken: str
    refreshToken: str
    tokenType: str = 'bearer'
    expiresIn: int = 900
