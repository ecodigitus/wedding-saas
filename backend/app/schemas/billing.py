import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    item_type: str | None
    item_key: str | None
    status: str
    amount_idr: int
    checkout_url: str
    created_at: datetime
    paid_at: datetime | None


class CatalogItemOut(BaseModel):
    key: str
    label: str
    price_idr: int
    max_guests: int | None = None


class CatalogOut(BaseModel):
    packages: list[CatalogItemOut]
    addons: list[CatalogItemOut]


class BillingStatusOut(BaseModel):
    package: str | None
    addons: list[str]
    catalog: CatalogOut
    latest_payment: PaymentOut | None


class PurchaseCreate(BaseModel):
    item_type: Literal["package", "addon"]
    item_key: str


class UpgradeResponseOut(BaseModel):
    checkout_url: str
    payment_id: uuid.UUID
