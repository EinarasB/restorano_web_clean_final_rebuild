from fastapi import APIRouter, Request, Form
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.status import HTTP_302_FOUND
from app.models import SessionLocal, User

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")


# REGISTRACIJA
@router.get("/register")
def register_form(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})


@router.post("/register")
def register_user(
    request: Request,
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...)
):
    db = SessionLocal()
    user = User(username=username, email=email, password=password)
    try:
        db.add(user)
        db.commit()
        return RedirectResponse("/menu", status_code=HTTP_302_FOUND)
    except IntegrityError:
        db.rollback()
        error = "Toks vartotojas arba el. paštas jau egzistuoja."
        return templates.TemplateResponse("register.html", {"request": request, "error": error})
    except Exception as e:
        db.rollback()
        error = f"Įvyko klaida: {e}"
        return templates.TemplateResponse("register.html", {"request": request, "error": error})
    finally:
        db.close()


# PRISIJUNGIMAS
@router.get("/login")
def login_form(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@router.post("/login")
def login_user(
    request: Request,
    username: str = Form(...),
    password: str = Form(...)
):
    db: Session = SessionLocal()
    user = db.query(User).filter(User.username == username, User.password == password).first()
    db.close()

    if user:
        return RedirectResponse("/menu", status_code=HTTP_302_FOUND)
    else:
        error = "Neteisingas vartotojo vardas arba slaptažodis."
        return templates.TemplateResponse("login.html", {"request": request, "error": error})


# ADMIN
@router.get("/admin")
def admin_login_form(request: Request):
    return templates.TemplateResponse("admin_login.html", {"request": request})


@router.post("/admin")
def admin_login(
    request: Request,
    username: str = Form(...),
    password: str = Form(...)
):
    if username == "admin" and password == "admin123":
        db = SessionLocal()
        users = db.query(User).all()
        db.close()
        return templates.TemplateResponse("admin_panel.html", {"request": request, "users": users})
    else:
        error = "Neteisingas vartotojo vardas arba slaptažodis."
        return templates.TemplateResponse("admin_login.html", {"request": request, "error": error})


# SVEČIAS
@router.get("/guest")
def guest_menu(request: Request):
    return templates.TemplateResponse("menu.html", {"request": request})


# PRISIJUNGĘ / REGISTRUOTI
@router.get("/menu")
def logged_in_menu(request: Request):
    return templates.TemplateResponse("menu.html", {"request": request})
