from fastapi import APIRouter

from app.api.routes import auth, billing, events, guestbook, guests, invitations, rsvp

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(billing.router)
api_router.include_router(billing.webhook_router)
api_router.include_router(events.router)
api_router.include_router(invitations.router)
api_router.include_router(rsvp.public_router)
api_router.include_router(rsvp.owner_router)
api_router.include_router(guestbook.public_router)
api_router.include_router(guestbook.owner_router)
api_router.include_router(guests.public_router)
api_router.include_router(guests.owner_router)
api_router.include_router(guests.checkin_router)
