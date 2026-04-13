const NUM_BARS = 12;

let mediaRecorder = null;
let audioChunks = [];
let analyser = null;
let animationId = null;
let startTime = 0;
let timerInterval = null;

// Build waveform bars
const waveformEl = document.getElementById('waveform');
for (let i = 0; i < NUM_BARS; i++) {
  const bar = document.createElement('div');
  bar.className = 'wave-bar';
  waveformEl.appendChild(bar);
}
const bars = waveformEl.querySelectorAll('.wave-bar');

function updateTimer() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  document.getElementById('timer').textContent = mins + ':' + String(secs).padStart(2, '0');
}

function animateWaveform() {
  if (!analyser) return;

  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);

  // Sample bars from frequency data
  const step = Math.floor(data.length / NUM_BARS);
  for (let i = 0; i < NUM_BARS; i++) {
    const value = data[i * step] || 0;
    const normalized = Math.max(4, (value / 255) * 18);
    bars[i].style.height = normalized + 'px';
    bars[i].classList.toggle('active', value > 40);
  }

  animationId = requestAnimationFrame(animateWaveform);
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Setup analyser for waveform visualization
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);

    // Setup recorder
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      // Stop all tracks
      stream.getTracks().forEach(t => t.stop());
      cancelAnimationFrame(animationId);
      clearInterval(timerInterval);

      if (audioChunks.length === 0) {
        window.electronAPI.voiceSendAudio(null);
        return;
      }

      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Show processing state
      document.getElementById('pill').classList.add('processing');

      // Send audio data to main process
      window.electronAPI.voiceSendAudio(Array.from(uint8Array));
    };

    mediaRecorder.start(250); // collect data every 250ms

    // Start timer
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);

    // Start waveform animation
    animateWaveform();

    // Tell main process we're recording
    window.electronAPI.voiceReady();
  } catch (error) {
    console.error('Failed to start recording:', error);
    window.electronAPI.voiceError(error.message || 'Erro ao acessar microfone');
  }
}

// Listen for stop command from main process
window.electronAPI.onVoiceStop(() => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
});

// Listen for done (transcription complete)
window.electronAPI.onVoiceDone(() => {
  document.getElementById('pill').classList.add('done');
});

// Start recording as soon as the page loads
startRecording();
