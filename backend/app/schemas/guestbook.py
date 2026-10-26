import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GuestbookCreate(BaseModel):
    nama: str = Field(min_length=1, max_length=150)
    pesan: str = Field(min_length=1, max_length=1000)


class GuestbookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nama: str
    pesan: str
    created_at: datetime
