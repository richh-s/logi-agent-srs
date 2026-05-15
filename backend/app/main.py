from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import shipments, orchestrator, logs, alerts

app = FastAPI(title="Logistics Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten this to your Next.js URL before deploying
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(shipments.router, prefix="/api/shipments", tags=["shipments"])
app.include_router(orchestrator.router, prefix="/api/orchestrator", tags=["orchestrator"])
app.include_router(logs.router, prefix="/api/logs", tags=["logs"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
