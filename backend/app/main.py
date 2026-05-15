from fastapi import FastAPI
from app.api import shipments

app = FastAPI(title="Logistics Agent API")

app.include_router(shipments.router, prefix="/api/shipments", tags=["shipments"])

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
