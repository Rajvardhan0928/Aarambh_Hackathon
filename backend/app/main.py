from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router

app = FastAPI(
    title="Space Safety & Debris Collision Avoidance Platform",
    description="Scientific Python Backend for Orbital Trajectory Tracking, Conjunction Analysis, Risk Assessment, and Energy-Optimal Avoidance Maneuver Optimization.",
    version="1.0.0"
)

# Enable CORS for local Vite frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/")
def root():
    return {
        "title": "Space Safety & Debris Collision Avoidance System API",
        "docs_url": "/docs",
        "api_health": "/api/health"
    }
