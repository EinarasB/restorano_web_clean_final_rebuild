import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router as register_router
from app.models import Base, engine
import uvicorn

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.include_router(register_router)

@app.get("/")
def read_root():
    return {"message": "Restoranas AI veikia!"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))  # <- Šita eilutė yra būtina Render
    uvicorn.run("run:app", host="0.0.0.0", port=port, reload=False)
