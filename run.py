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


# 1. Sukuriame FastAPI instancą
app = FastAPI()

# 2. Inicializuojam DB
Base.metadata.create_all(bind=engine)

# 3. Middleware (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Statiniai failai (CSS, paveikslėliai)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# 5. Jinja2 šablonai (HTML)
templates = Jinja2Templates(directory="app/templates")

# 6. Pridedam Routerį
app.include_router(register_router)

# 7. Pagrindinis puslapis
@app.get("/")
def homepage(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# 8. Paleidimas lokaliai (naudinga dev režime)
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("run:app", host="0.0.0.0", port=port)
