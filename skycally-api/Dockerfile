FROM python:3.11-slim

# Install LibreOffice + ffmpeg (needed for yt-dlp merging)
RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-writer \
    ffmpeg \
    fonts-dejavu \
    fonts-liberation \
    fonts-noto \
    fonts-noto-cjk \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download rembg u2net model to avoid cold-start network fetch
RUN python -c "from rembg import new_session; new_session('u2net')"

COPY . .

# Railway provides $PORT — fall back to 8000 for local dev
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
