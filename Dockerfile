FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    gcc \
    g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

RUN pip install --upgrade pip setuptools wheel

RUN pip install --no-cache-dir -r requirements.txt

RUN pip install --no-cache-dir git+https://github.com/openai/whisper.git

COPY . .

# Download Whisper model during build
ARG WHISPER_MODEL=base
ENV WHISPER_MODEL=${WHISPER_MODEL}

RUN python -c "import os, whisper; whisper.load_model(os.environ['WHISPER_MODEL'])"

ENV PORT=10000
EXPOSE 10000

CMD gunicorn app:app \
    --bind 0.0.0.0:${PORT} \
    --workers 1 \
    --threads 2 \
    --timeout 300 \
    --max-requests 20 \
    --max-requests-jitter 5
