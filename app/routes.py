
from fastapi import APIRouter, Form, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from app.models import SessionLocal, User

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

@router.get("/register")
def register_form(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

@router.post("/register")
def register_user(request: Request, username: str = Form(...), password: str = Form(...)):
    db = SessionLocal()
    user = User(username=username, password=password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return RedirectResponse(url="/login", status_code=303)
