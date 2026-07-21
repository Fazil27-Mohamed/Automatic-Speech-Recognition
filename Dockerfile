FROM python:3.11-slim

# whisper shells out to the ffmpeg binary to decode audio - it is NOT
# installed by pip and is not present on Render's default Python image.
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Bake the model weights into the image at build time so the container
# doesn't have to download ~150MB from OpenAI's CDN on every cold start.
# Change to "tiny" here (and in render.yaml) if "base" doesn't fit in RAM.
ARG WHISPER_MODEL=base
ENV WHISPER_MODEL=${WHISPER_MODEL}
RUN python -c "import os, whisper; whisper.load_model(os.environ['WHISPER_MODEL'])"

ENV PORT=10000
EXPOSE 10000

CMD gunicorn app:app \
    --workers 1 \
    --threads 2 \
    --timeout 300 \
    --max-requests 20 \
    --max-requests-jitter 5 \
    --bind 0.0.0.0:$PORT
