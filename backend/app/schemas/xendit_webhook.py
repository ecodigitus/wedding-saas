from pydantic import BaseModel, ConfigDict


class XenditInvoiceWebhook(BaseModel):
    """Payload webhook Xendit — cuma ambil field yang kita pakai, sisanya
    diabaikan (Xendit kirim banyak field lain yang tidak relevan di sini)."""

    model_config = ConfigDict(extra="ignore")

    id: str
    external_id: str
    status: str
    paid_amount: int | None = None
