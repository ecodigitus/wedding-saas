import boto3
import pytest
from moto import mock_aws

from app.core import storage
from app.core.config import settings


@pytest.fixture()
def moto_s3(monkeypatch):
    """moto men-intercept endpoint AWS S3 asli — makanya di sini
    `s3_endpoint_url` di-override ke None (bukan MinIO lokal), supaya boto3
    memanggil endpoint AWS default yang moto kenali."""
    with mock_aws():
        monkeypatch.setattr(settings, "s3_endpoint_url", None)
        monkeypatch.setattr(settings, "s3_access_key", "test-key")
        monkeypatch.setattr(settings, "s3_secret_key", "test-secret")
        monkeypatch.setattr(settings, "s3_bucket_private", "test-bucket-private")
        monkeypatch.setattr(settings, "s3_region", "us-east-1")

        client = boto3.client("s3", region_name="us-east-1")
        client.create_bucket(Bucket="test-bucket-private")
        yield


def test_upload_and_retrieve_object(moto_s3):
    storage.upload_private_object("selfies/abc/xyz.jpg", b"fake-jpeg-bytes", "image/jpeg")

    client = boto3.client("s3", region_name="us-east-1")
    obj = client.get_object(Bucket="test-bucket-private", Key="selfies/abc/xyz.jpg")
    assert obj["Body"].read() == b"fake-jpeg-bytes"
    assert obj["ContentType"] == "image/jpeg"


def test_generate_signed_url_contains_key_and_bucket(moto_s3):
    storage.upload_private_object("selfies/abc/xyz.jpg", b"fake-jpeg-bytes", "image/jpeg")
    url = storage.generate_signed_url("selfies/abc/xyz.jpg", expires_in=60)

    assert "test-bucket-private" in url
    assert "selfies/abc/xyz.jpg" in url
    assert "X-Amz-Expires=60" in url


def test_make_selfie_key_is_unique_per_call():
    import uuid

    guest_id = uuid.uuid4()
    key1 = storage.make_selfie_key(guest_id)
    key2 = storage.make_selfie_key(guest_id)
    assert key1 != key2
    assert str(guest_id) in key1
    assert key1.startswith("selfies/")
    assert key1.endswith(".jpg")


def test_storage_not_configured_raises_clear_error(monkeypatch):
    monkeypatch.setattr(settings, "s3_bucket_private", None)
    with pytest.raises(storage.StorageNotConfiguredError):
        storage.upload_private_object("some/key.jpg", b"data", "image/jpeg")
