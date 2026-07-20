const audioFile = document.getElementById("audioFile");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");

const startRecord = document.getElementById("startRecord");
const stopRecord = document.getElementById("stopRecord");

const convertBtn = document.getElementById("convertBtn");

const transcript = document.getElementById("transcript");

const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");

const loading = document.getElementById("loading");

const wordCount = document.getElementById("wordCount");
const charCount = document.getElementById("charCount");
const language = document.getElementById("language");

const recordStatus = document.getElementById("recordStatus");
const timer = document.getElementById("timer");

let mediaRecorder;
let audioChunks = [];
let recordedBlob = null;

let timerInterval;
let seconds = 0;

/* ---------------- FILE ---------------- */

audioFile.addEventListener("change", () => {

    if (audioFile.files.length > 0) {

        const file = audioFile.files[0];

        fileName.innerHTML = file.name;

        fileSize.innerHTML =
            (file.size / (1024 * 1024)).toFixed(2) + " MB";

    }

});

/* ---------------- TIMER ---------------- */

function startTimer() {

    seconds = 0;

    timerInterval = setInterval(() => {

        seconds++;

        const min = String(Math.floor(seconds / 60)).padStart(2, "0");

        const sec = String(seconds % 60).padStart(2, "0");

        timer.innerHTML = `${min}:${sec}`;

    }, 1000);

}

function stopTimer() {

    clearInterval(timerInterval);

}

/* ---------------- RECORD ---------------- */

startRecord.addEventListener("click", async () => {

    const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
    });

    mediaRecorder = new MediaRecorder(stream);

    audioChunks = [];

    mediaRecorder.start();

    startRecord.disabled = true;
    stopRecord.disabled = false;

    recordStatus.innerHTML = "🔴 Recording...";

    startTimer();

    mediaRecorder.ondataavailable = (e) => {

        audioChunks.push(e.data);

    };

    mediaRecorder.onstop = () => {

        recordedBlob = new Blob(audioChunks, {
            type: "audio/wav"
        });

        fileName.innerHTML = "Recorded Audio.wav";

        fileSize.innerHTML =
            (recordedBlob.size / (1024 * 1024)).toFixed(2) + " MB";

        recordStatus.innerHTML = "✅ Recording Completed";

        stopTimer();

    };

});

/* ---------------- STOP ---------------- */

stopRecord.addEventListener("click", () => {

    mediaRecorder.stop();

    startRecord.disabled = false;
    stopRecord.disabled = true;

});

/* ---------------- CONVERT ---------------- */

convertBtn.addEventListener("click", async () => {

    let formData = new FormData();

    if (audioFile.files.length > 0) {

        formData.append("audio", audioFile.files[0]);

    }

    else if (recordedBlob) {

        formData.append("audio", recordedBlob, "recorded.wav");

    }

    else {

        alert("Select or Record Audio");

        return;

    }

    loading.style.display = "block";

    transcript.value = "";

    try {

        const response = await fetch("/predict", {

            method: "POST",

            body: formData

        });

        const data = await response.json();

        transcript.value = data.transcript;

        updateStats();

    }

    catch {

        transcript.value = "Error while processing audio.";

    }

    loading.style.display = "none";

});

/* ---------------- STATS ---------------- */

function updateStats() {

    const text = transcript.value.trim();

    charCount.innerHTML = text.length;

    if (text === "") {

        wordCount.innerHTML = 0;

    }

    else {

        wordCount.innerHTML = text.split(/\s+/).length;

    }

    language.innerHTML = "EN";

}

/* ---------------- COPY ---------------- */

copyBtn.addEventListener("click", () => {

    if (transcript.value == "") {

        alert("Transcript Empty");

        return;

    }

    navigator.clipboard.writeText(transcript.value);

    copyBtn.innerHTML =
        '<i class="fa-solid fa-check"></i> Copied';

    setTimeout(() => {

        copyBtn.innerHTML =
            '<i class="fa-solid fa-copy"></i> Copy';

    }, 2000);

});

/* ---------------- DOWNLOAD ---------------- */

downloadBtn.addEventListener("click", () => {

    if (transcript.value == "") {

        alert("No Transcript");

        return;

    }

    const blob = new Blob([transcript.value], {

        type: "text/plain"

    });

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);

    link.download = "Transcript.txt";

    link.click();

});

/* ---------------- CLEAR ---------------- */

clearBtn.addEventListener("click", () => {

    transcript.value = "";

    audioFile.value = "";

    recordedBlob = null;

    fileName.innerHTML = "No File Selected";

    fileSize.innerHTML = "Waiting for audio...";

    recordStatus.innerHTML = "Ready to Record";

    timer.innerHTML = "00:00";

    wordCount.innerHTML = 0;

    charCount.innerHTML = 0;

    language.innerHTML = "EN";

});

/* ---------------- DRAG & DROP ---------------- */

const uploadArea = document.querySelector(".upload-area");

uploadArea.addEventListener("dragover", (e) => {

    e.preventDefault();

    uploadArea.style.borderColor = "#38bdf8";

});

uploadArea.addEventListener("dragleave", () => {

    uploadArea.style.borderColor =
        "rgba(255,255,255,.25)";

});

uploadArea.addEventListener("drop", (e) => {

    e.preventDefault();

    audioFile.files = e.dataTransfer.files;

    audioFile.dispatchEvent(new Event("change"));

    uploadArea.style.borderColor =
        "rgba(255,255,255,.25)";

});