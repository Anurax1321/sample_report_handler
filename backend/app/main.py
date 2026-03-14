from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi.errors import RateLimitExceeded
import asyncio
from app.core.config import settings
from app.core.rate_limit import limiter
from app.api.routes_auth import router as auth_router
from app.api.routes_samples import router as samples_router
from app.api.routes_reports import router as reports_router
from app.api.routes_analyzer import router as analyzer_router
from app.api.routes_deploy import router as deploy_router


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
║  📍 Backend API:       http://localhost:8002              ║
║  📚 API Docs:          http://localhost:8002/docs         ║
║  ❤️  Health Check:     http://localhost:8002/health       ║
║                                                            ║
║  🎨 Frontend:          http://localhost:3002              ║
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

# Rate limiting
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please try again later."},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth_router)
app.include_router(samples_router)
app.include_router(reports_router)
app.include_router(analyzer_router)
app.include_router(deploy_router)

@app.get("/health")
def health():
    return {"status": "ok"}
