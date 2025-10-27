from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.routes_samples import router as samples_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("\n" + "="*60)
    print("🚀 Sample Report Handler API Started!")
    print("="*60)
    print("📍 Backend API:        http://localhost:8000")
    print("📚 API Docs:           http://localhost:8000/docs")
    print("❤️  Health Check:      http://localhost:8000/health")
    print("🎨 Frontend:           http://localhost:3000")
    print("="*60 + "\n")
    yield
    # Shutdown
    print("\n👋 Shutting down...\n")


app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(samples_router)

@app.get("/health")
def health():
    return {"status": "ok"}
