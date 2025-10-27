from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from app.core.config import settings
from app.api.routes_samples import router as samples_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup - wait a moment for uvicorn logs to finish
    await asyncio.sleep(0.5)

    banner = """
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║         🚀 Sample Report Handler - READY TO USE 🚀        ║
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  📍 Backend API:       http://localhost:8000              ║
║  📚 API Docs:          http://localhost:8000/docs         ║
║  ❤️  Health Check:     http://localhost:8000/health       ║
║                                                            ║
║  🎨 Frontend:          http://localhost:3000              ║
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  💡 Tip: Open the API docs to test endpoints interactively║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
"""
    print(banner, flush=True)

    yield

    # Shutdown
    print("\n👋 Shutting down Sample Report Handler...\n", flush=True)


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
