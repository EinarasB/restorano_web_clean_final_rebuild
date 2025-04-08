from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Naudojame DATABASE_URL iš aplinkos kintamųjų
DATABASE_URL = os.environ.get("DATABASE_URL")

# Sukuriam variklį
engine = create_engine(DATABASE_URL)

# Sukuriam sesiją ir bazę
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
