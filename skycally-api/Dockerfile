FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-writer \
    ffmpeg \
    fonts-dejavu \
    fonts-liberation \
    fonts-noto \
    fonts-noto-cjk \
    libgl1 \
    libglib2.0-0 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN python -c "from rembg import new_session; new_session('u2net')"

COPY . .

ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
