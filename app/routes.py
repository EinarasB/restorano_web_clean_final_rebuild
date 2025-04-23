from fastapi import APIRouter, Request, Form
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.status import HTTP_302_FOUND
from app.models import SessionLocal, User, Order, OrderItem, Reservation
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
import os
import json
import traceback

load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY", "").replace("\n", "").strip()

if not openai_api_key:
    raise ValueError("❌ Nepavyko gauti OpenAI API rakto!")

print("🔐 API KEY:", openai_api_key[:8] + "..." + openai_api_key[-4:])

client = OpenAI(api_key=openai_api_key)

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

# ======== AI CHAT ==========
class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    try:
        print("🧠 Gauta žinutė:", req.message)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Tu esi restorano padavėjas. Atsakinėk trumpai, aiškiai ir draugiškai.\n"
                        "Kai klientas prašo atlikti veiksmą, grąžink JSON (kaip tekstą) su:\n"
                        "- {\"action\": \"add_to_cart\", \"item\": \"Pavadinimas\", \"quantity\": 2}\n"
                        "- {\"action\": \"remove_from_cart\", \"item\": \"Pavadinimas\"}\n"
                        "- {\"action\": \"get_cart\"}\n"
                        "- {\"action\": \"get_total\"}\n"
                        "- {\"action\": \"filter_price\", \"max_price\": 5.00}\n"
                        "- {\"action\": \"daily_offer\"}\n\n"
                        "Galimi patiekalai:\n"
                        "Margarita, Cheeseburger, Vištienos sriuba, Makaronai su vištiena, Jautienos kepsnys, "
                        "Caesar salotos, Šokoladinis pyragas, Pankekai, Latte kava, Coca-Cola, Žalioji arbata.\n"
                        "Nefantazuok. Kainos yra tokios, kaip HTML meniu. Jeigu klausimas paprastas – atsakyk tekstu."
                    )
                },
                {
                    "role": "user",
                    "content": req.message
                }
            ]
        )
        content = response.choices[0].message.content.strip()
        print("📩 AI atsakymas:", content)

        try:
            parsed_json = json.loads(content)
            return JSONResponse(content=parsed_json)
        except json.JSONDecodeError:
            return JSONResponse(content={"reply": content})

    except Exception as e:
        print("💥 Klaida:", e)
        traceback.print_exc()
        return JSONResponse(content={"reply": f"Klaida: {str(e)}"})

# ======== REGISTRACIJA ==========
@router.get("/register")
def register_form(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

@router.post("/register")
def register_user(request: Request, username: str = Form(...), email: str = Form(...), password: str = Form(...)):
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

# ======== AUTH ==========
@router.get("/logout")
def logout():
    response = RedirectResponse(url="/guest", status_code=302)
    response.delete_cookie("username")
    return response

@router.get("/login")
def login_form(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@router.post("/login")
def login_user(request: Request, username: str = Form(...), password: str = Form(...)):
    db: Session = SessionLocal()
    user = db.query(User).filter(User.username == username, User.password == password).first()
    db.close()
    if user:
        response = RedirectResponse("/menu", status_code=HTTP_302_FOUND)
        response.set_cookie(key="username", value=username)
        return response
    else:
        error = "Neteisingas vartotojo vardas arba slaptažodis."
        return templates.TemplateResponse("login.html", {"request": request, "error": error})

# ======== ADMIN ==========
@router.get("/admin")
def admin_login_form(request: Request):
    return templates.TemplateResponse("admin_login.html", {"request": request})

@router.post("/admin")
def admin_login(request: Request, username: str = Form(...), password: str = Form(...)):
    if username == "admin" and password == "admin123":
        db = SessionLocal()
        users = db.query(User).all()
        db.close()
        return templates.TemplateResponse("admin_panel.html", {"request": request, "users": users})
    else:
        error = "Neteisingas vartotojo vardas arba slaptažodis."
        return templates.TemplateResponse("admin_login.html", {"request": request, "error": error})

@router.post("/admin/reset-reservations")
def reset_reservations():
    db = SessionLocal()
    db.query(Reservation).delete()
    db.commit()
    db.close()
    return RedirectResponse("/admin", status_code=302)

# ======== MENU / GUEST ==========
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
def submit_order(request: Request, payment_method: str = Form(...), order_data: str = Form(...)):
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

# ======== REZERVACIJA ==========
@router.get("/reserve")
def reserve_page(request: Request):
    username = request.cookies.get("username")
    if not username:
        return RedirectResponse("/login", status_code=302)

    db = SessionLocal()
    reservations = db.query(Reservation).all()
    db.close()
    reserved_tables = [r.table_id for r in reservations]

    table_positions = {
        1: {"top": 27, "left": 287},
        2: {"top": 145, "left": 287},
        3: {"top": 245, "left": 287},
        4: {"top": 346, "left": 287},
        5: {"top": 45, "left": 66},
        6: {"top": 45, "left": 175},
        7: {"top": 185, "left": 66},
        8: {"top": 325, "left": 66},
        9: {"top": 453, "left": 59},
        10: {"top": 493, "left": 170},
        11: {"top": 181, "left": 411},
        12: {"top": 291, "left": 410}
    }

    return templates.TemplateResponse("reserve.html", {
        "request": request,
        "username": username,
        "reserved_tables": reserved_tables,
        "table_positions": table_positions
    })

@router.post("/reserve")
def submit_reservation(request: Request, table_id: str = Form(...)):
    username = request.cookies.get("username")
    if not username:
        return RedirectResponse("/login", status_code=302)

    db = SessionLocal()

    # Patikrinam ar jau rezervuota
    existing = db.query(Reservation).filter(Reservation.table_id == table_id).first()
    if existing:
        db.close()
        return RedirectResponse("/reserve", status_code=302)

    reservation = Reservation(username=username, table_id=table_id)
    db.add(reservation)
    db.commit()
    db.close()
    return RedirectResponse("/menu", status_code=302)
