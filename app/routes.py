from fastapi import APIRouter, Request, Form
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.status import HTTP_302_FOUND
from app.models import SessionLocal, User, Order, OrderItem, Reservation, ChatMessage
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
from collections import defaultdict
import os
import json
import traceback
from datetime import datetime
from sqlalchemy import func
from fastapi import Path
import smtplib
from email.message import EmailMessage


load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY", "").replace("\n", "").strip()

if not openai_api_key:
    raise ValueError("❌ Nepavyko gauti OpenAI API rakto!")

print("🔐 API KEY:", openai_api_key[:8] + "..." + openai_api_key[-4:])

client = OpenAI(api_key=openai_api_key)

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")
session_memory = defaultdict(list)

# ======== AI CHAT ==========
class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def chat_endpoint(req: ChatRequest, request: Request):
    try:
        username = request.cookies.get("username")
        ip = request.client.host
        db = SessionLocal()

        system_prompt = {
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
                 "Galimi patiekalai ir jų kainos:\n"
    "- Margarita: €7.99\n"
    "- Burgeris: €8.49\n"
    "- Vištienos sriuba: €4.99\n"
    "- Makaronai su vištiena: €9.49\n"
    "- Jautienos kepsnys: €13.99\n"
    "- Cezario salotos: €6.49\n"
    "- Spurga su šokoladu: €5.49\n"
    "- Blyneliai: €4.99\n"
    "- Latte kava: €2.49\n"
    "- Coca-Cola: €2.99\n"
    "- Žalioji arbata: €1.49\n\n"
                "Nefantazuok. Kainos yra tokios, kaip HTML meniu. Jeigu klausimas paprastas – atsakyk tekstu.\n"
                "Jei klientas klausia apie dienos pasiūlymą – trumpai apibūdink jį žodžiais, pvz., "
                "'Šiandien siūlome Margaritą, Latte kavą ir spurgą'. Tada paklausk: "
                "'Ar norėtumėte pridėti juos į krepšelį?'. Tik jei klientas sutinka – siųsk JSON {\"action\": \"daily_offer\"}."
            )
        }

        # Pokalbio istorija
        messages = [system_prompt]
        if username:
            history = db.query(ChatMessage).filter(ChatMessage.username == username).order_by(ChatMessage.timestamp).all()
            messages += [{"role": m.role, "content": m.content} for m in history[-10:]]
        else:
            messages += session_memory[ip][-10:]

        # Nauja žinutė
        messages.append({"role": "user", "content": req.message})

        # DI užklausa
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages
        )
        content = response.choices[0].message.content.strip()
        print("📩 AI atsakymas:", content)

        # Išsaugojimas
        if username:
            db.add(ChatMessage(username=username, role="user", content=req.message))
            db.add(ChatMessage(username=username, role="assistant", content=content))
            db.commit()
        else:
            session_memory[ip].append({"role": "user", "content": req.message})
            session_memory[ip].append({"role": "assistant", "content": content})

        try:
            return JSONResponse(content=json.loads(content))
        except json.JSONDecodeError:
            return JSONResponse(content={"reply": content})

    except Exception as e:
        print("💥 Klaida:", e)
        traceback.print_exc()
        return JSONResponse(content={"reply": f"Klaida: {str(e)}"})
    finally:
        db.close()

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

        # El. pašto siuntimas po sėkmingos registracijos
        try:
            msg = EmailMessage()
            msg['Subject'] = 'Registracija sėkminga'
            msg['From'] = os.getenv("MAIL_FROM")
            msg['To'] = email
            msg.set_content(
                f"Sveiki, {username}!\n\nDėkojame, kad prisijungėte prie RestoranasAI.lt\n\nJūsų paskyra sėkmingai sukurta – nuo šiol galite lengvai rezervuoti staliukus, peržiūrėti meniu ir bendrauti su mūsų DI padavėju.\nJei turite klausimų ar pasiūlymų, rašykite mums į el. paštą: restoranasdi@gmail.com\nSkanaus ir malonaus naudojimosi sistema!\n\nEinaras Bargaila\nhttps://www.restoranasai.lt"
            )

            # Naudojam SMTP_SSL jei jungiamės per 465 portą
            smtp_server = os.getenv("MAIL_SERVER", "smtp.gmail.com")
            smtp_port = int(os.getenv("MAIL_PORT", 465))

            with smtplib.SMTP_SSL(smtp_server, smtp_port) as smtp:
                smtp.login(os.getenv("MAIL_FROM"), os.getenv("MAIL_PASSWORD"))
                smtp.send_message(msg)

        except Exception as e:
            print("❌ Nepavyko išsiųsti el. laiško:", e)

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
@router.get("/admin-login")
def show_admin_login(request: Request):
    return templates.TemplateResponse("admin_login.html", {"request": request})

# 2. Tikrina vartotojo vardą ir slaptažodį
@router.post("/admin")
def admin_login(request: Request, username: str = Form(...), password: str = Form(...)):
    correct_username = os.getenv("ADMIN_USER", "admin")
    correct_password = os.getenv("ADMIN_PASSWORD", "slaptas123")

    if username == correct_username and password == correct_password:
        response = RedirectResponse(url="/admin-panel", status_code=302)
        response.set_cookie(key="admin_auth", value="true")
        return response
    else:
        error = "❌ Neteisingas vartotojo vardas arba slaptažodis."
        return templates.TemplateResponse("admin_login.html", {"request": request, "error": error})

# 3. Admin panelė, pasiekiama tik prisijungus
@router.get("/admin-panel")
def show_admin_panel(request: Request):
    if request.cookies.get("admin_auth") != "true":
        return RedirectResponse("/admin-login", status_code=302)

    db = SessionLocal()
    users = db.query(User).all()
    reservations = db.query(Reservation).order_by(Reservation.reserved_at.desc()).all()
    db.close()

    return templates.TemplateResponse("admin_panel.html", {
        "request": request,
        "users": users,
        "reservations": reservations
    })

# 4. Atsijungimas (jei reikia)
@router.get("/admin-logout")
def admin_logout():
    response = RedirectResponse("/admin-login", status_code=302)
    response.delete_cookie("admin_auth")
    return response

@router.post("/admin/delete-reservation")
def delete_reservation(reservation_id: int = Form(...)):
    db = SessionLocal()
    db.query(Reservation).filter(Reservation.id == reservation_id).delete()
    db.commit()
    db.close()
    return RedirectResponse("/admin", status_code=302)


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
    1:  {"top": "12%", "left": "16%"},
    2:  {"top": "37%", "left": "16%"},
    3:  {"top": "62%", "left": "16%"},
    4:  {"top": "84.5%", "left": "15%"},
    5:  {"top": "12%", "left": "37%"},
    6:  {"top": "82%", "left": "36.5%"},
    7:  {"top": "8.5%", "left": "58.8%"},
    8:  {"top": "29.5%", "left": "58.8%"},
    9:  {"top": "47.5%", "left": "58.8%"},
    10: {"top": "65.5%", "left": "58.8%"},
    11: {"top": "36%", "left": "82.5%"},
    12: {"top": "55.5%", "left": "82.5%"}
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

@router.get("/chat-history")
def chat_history_dates(request: Request):
    username = request.cookies.get("username")
    if not username:
        return RedirectResponse("/login", status_code=302)

    db = SessionLocal()
    # Išrenkame unikalių datų sąrašą
    dates = db.query(func.date(ChatMessage.timestamp)).filter(ChatMessage.username == username).distinct().all()
    db.close()

    date_list = [str(date[0]) for date in dates]  # Konvertuojame į string sąrašą

    return templates.TemplateResponse("chat_history_dates.html", {
        "request": request,
        "dates": date_list
    })

@router.get("/chat-history/{date}")
def chat_history_by_date(request: Request, date: str = Path(...)):
    username = request.cookies.get("username")
    if not username:
        return RedirectResponse("/login", status_code=302)

    db = SessionLocal()
    messages = db.query(ChatMessage).filter(
        ChatMessage.username == username,
        func.date(ChatMessage.timestamp) == date
    ).order_by(ChatMessage.timestamp).all()
    db.close()

    return templates.TemplateResponse("chat_history_by_date.html", {
        "request": request,
        "messages": messages,
        "selected_date": date
    })
