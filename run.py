from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from app.routes import router as register_router
from app.models import Base, engine
import uvicorn
import os
from dotenv import load_dotenv
load_dotenv()



app = FastAPI()
app.include_router(register_router)
print("🔗 DATABASE_URL:", os.environ.get("DATABASE_URL"))
Base.metadata.create_all(bind=engine)
print("✅ Duomenų bazės lentelės sukurtos")

Base.metadata.create_all(bind=engine)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount("/static", StaticFiles(directory="app/static"), name="static")


templates = Jinja2Templates(directory="app/templates")


app.include_router(register_router)


@app.get("/")
def homepage(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("run:app", host="0.0.0.0", port=port)
