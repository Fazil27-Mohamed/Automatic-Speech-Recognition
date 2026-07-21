import os

# Keep torch single-threaded BEFORE it's imported - multi-threaded BLAS/OMP
# kernels each allocate their own buffers, a common cause of OOM on small dynos.
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"

import gc
import whisper
import torch

from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder="frontend", template_folder="frontend")

# Reject uploads bigger than 25 MB outright so a huge file can't blow the dyno.
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024

UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "output"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

torch.set_num_threads(1)

# "tiny" (~75MB RAM) is the safest choice on a 512MB instance.
# "base" (~290MB RAM) works too but leaves little headroom - if you see
# the dyno crash/restart under load, switch this env var to "tiny" on Render.
MODEL_SIZE = os.environ.get("WHISPER_MODEL", "base")

print(f"Loading Whisper model: {MODEL_SIZE} ...")
model = whisper.load_model(MODEL_SIZE, device="cpu")
print("Model loaded successfully")


@app.route("/")
def home():
    return send_from_directory("frontend", "index.html")


@app.route("/style.css")
def css():
    return send_from_directory("frontend", "style.css")


@app.route("/script.js")
def js():
    return send_from_directory("frontend", "script.js")


@app.route("/predict", methods=["POST"])
def predict():

    if "audio" not in request.files:
        return jsonify({"transcript": "No audio file received."})

    audio = request.files["audio"]

    if audio.filename == "":
        return jsonify({"transcript": "Please choose an audio file."})

    file_path = os.path.join(UPLOAD_FOLDER, audio.filename)
    audio.save(file_path)

    try:
        with torch.no_grad():
            result = model.transcribe(file_path, fp16=False)

        transcript = result["text"]

        with open(
            os.path.join(OUTPUT_FOLDER, "transcript.txt"),
            "w",
            encoding="utf-8"
        ) as f:
            f.write(transcript)

        return jsonify({"transcript": transcript})

    except Exception as e:
        return jsonify({"transcript": f"Error: {e}"})

    finally:
        # Always clean up, even on failure.
        try:
            os.remove(file_path)
        except OSError:
            pass
        gc.collect()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
