from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# SQLite DB lokaliai (ar Render'e veiktų)
DATABASE_URL = "sqlite:///./app.db"

# Sukuriamas variklis
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Sesijos objektas darbui su DB
SessionLocal = sessionmaker(bind=engine)

# Bazinė klasė modeliams
Base = declarative_base()

# Vartotojo modelis
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
