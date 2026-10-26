import secrets

from slugify import slugify
from sqlalchemy.orm import Session

from app.models.event import Event


def generate_unique_slug(db: Session, partner1_name: str, partner2_name: str) -> str:
    base = slugify(f"{partner1_name}-{partner2_name}")[:60] or "undangan"
    slug = base
    while db.query(Event).filter(Event.slug == slug).first() is not None:
        slug = f"{base}-{secrets.token_hex(3)}"
    return slug
