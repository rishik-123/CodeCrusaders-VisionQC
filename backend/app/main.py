import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.config import settings, UPLOADS_DIR, RESULTS_DIR
from backend.app.database.database import init_db
from backend.app.api.products import router as products_router
from backend.app.api.training import router as training_router
from backend.app.api.inspections import router as inspections_router
from backend.app.api.dashboard import router as dashboard_router
from backend.app.api.insights import router as insights_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    init_db()
    yield

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Production-grade AI/ML Visual Quality Inspection Backend powered by PatchCore anomaly detection.",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file mounts for heatmaps and uploads
if (RESULTS_DIR / "heatmaps").exists():
    app.mount("/results/heatmaps", StaticFiles(directory=str(RESULTS_DIR / "heatmaps")), name="heatmaps")

if UPLOADS_DIR.exists():
    app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Include API Routers
app.include_router(products_router)
app.include_router(training_router)
app.include_router(inspections_router)
app.include_router(dashboard_router)
app.include_router(insights_router)

@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "docs_url": "/docs",
        "openapi_url": "/openapi.json"
    }
