from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY not found")

ALGORITHM = "HS256"

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("sqlite:///"):
    db_path = DATABASE_URL.replace("sqlite:///", "")
    if not os.path.isabs(db_path):
        # Resolve path relative to backend folder root
        backend_base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        abs_db_path = os.path.join(backend_base, db_path)
        # Auto-create the directory path if it doesn't exist
        os.makedirs(os.path.dirname(abs_db_path), exist_ok=True)
        DATABASE_URL = f"sqlite:///{abs_db_path}"