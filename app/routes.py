from fastapi import APIRouter, Request, Form
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from starlette.status import HTTP_302_FOUND
from app.models import SessionLocal, User

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

# Registracijos formos atvaizdavimas
@router.get("/register")
def register_form(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

# Registracijos duomenų apdorojimas (forma siunčia POST)
@router.post("/register")
def register_user(
    request: Request,
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...)
):
    db = SessionLocal()
    user = User(username=username, email=email, password=password)
    db.add(user)
    db.commit()
    db.close()
    return RedirectResponse("/", status_code=HTTP_302_FOUND)
