from fastapi import APIRouter, Request, Form
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.status import HTTP_302_FOUND
from app.models import SessionLocal, User, Order, OrderItem
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
import os
import json

load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=openai_api_key)

print("🔐 API KEY:", openai_api_key)


# ✅ ČIA VIENAS router
router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

# ======== AI CHAT ==========
class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "Tu esi draugiškas padavėjas restorane, kuris padeda klientams pasirinkti patiekalus ir atsako į klausimus."},
                {"role": "user", "content": req.message}
            ]
        )
        reply = response.choices[0].message.content
        return JSONResponse(content={"reply": reply})
    except Exception as e:
        return JSONResponse(content={"reply": f"Klaida: {str(e)}"})

# ======== REGISTRACIJA ==========
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

# ======== PRISIJUNGIMAS ==========
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

# ======== ADMIN ==========
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

# ======== MENIU ==========
@router.get("/guest")
def guest_menu(request: Request):
    return templates.TemplateResponse("menu.html", {"request": request})

@router.get("/menu")
def logged_in_menu(request: Request):
    return templates.TemplateResponse("menu.html", {"request": request})

# ======== CHECKOUT ==========
@router.get("/checkout")
def checkout_page(request: Request):
    return templates.TemplateResponse("checkout.html", {"request": request})

@router.post("/checkout")
def submit_order(
    request: Request,
    payment_method: str = Form(...),
    order_data: str = Form(...)
):
    db = SessionLocal()
    try:
        order = Order(payment_method=payment_method)
        db.add(order)
        db.commit()
        db.refresh(order)

        items = json.loads(order_data)
        for item in items:
            order_item = OrderItem(
                order_id=order.id,
                name=item['name'],
                quantity=item['quantity'],
                price=item['price']
            )
            db.add(order_item)

        db.commit()
        return templates.TemplateResponse("checkout_success.html", {"request": request, "order_id": order.id})
    except Exception as e:
        db.rollback()
        return templates.TemplateResponse("checkout.html", {"request": request, "error": f"Klaida: {e}"})
    finally:
        db.close()
