from dotenv import load_dotenv
import os
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Import models to ensure tables are created
from app.database import Base, engine
from app.models.user import User
from app.models.project import Project
from app.models.query import Query

# Auto-create tables
Base.metadata.create_all(bind=engine)

if not os.getenv("SECRET_KEY"):
    raise ValueError("No SECRET_KEY set for JWT authentication")

from app.api.auth import router as auth_router
from app.api.projects import router as projects_router
from app.api.schema import router as schema_router
from app.api.query import router as query_router
from app.api.execution import router as execution_router
from app.api.dashboard import router as dashboard_router
from app.core.limiter import limiter

app = FastAPI(
    title="NL2SQL Assistant API",
    description="Backend services for the AI-powered Natural Language to SQL Assistant"
)

# Rate limiting setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
else:
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ]

# FastAPI CORSMiddleware requires allow_credentials=False if allow_origins includes "*"
allow_credentials = True
if "*" in allowed_origins:
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api/v1")
app.include_router(schema_router, prefix="/api/v1")
app.include_router(query_router, prefix="/api/v1")
app.include_router(execution_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")

@app.get("/")
def home():
    return {
        "status": "online",
        "message": "NL2SQL Assistant Backend is up and running"
    }