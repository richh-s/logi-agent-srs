# Use a slim Python image for a smaller Cloud Run footprint
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy and install dependencies first (Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY ./app ./app

# Expose the port Cloud Run expects
EXPOSE 8080

# Start the server — Cloud Run injects $PORT, uvicorn reads it
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
