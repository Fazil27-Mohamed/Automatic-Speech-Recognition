import os
import whisper

from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder="frontend", template_folder="frontend")

UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "output"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

print("Loading Whisper Model...")
model = whisper.load_model("base")
print("Model Loaded Successfully")


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

        result = model.transcribe(file_path, fp16=False)

        transcript = result["text"]

        with open(
            os.path.join(OUTPUT_FOLDER, "transcript.txt"),
            "w",
            encoding="utf-8"
        ) as f:

            f.write(transcript)

        return jsonify({
            "transcript": transcript
        })

    except Exception as e:

        return jsonify({
            "transcript": str(e)
        })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7860)
