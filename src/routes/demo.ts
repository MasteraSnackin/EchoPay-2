import { Hono } from 'hono';

export const demo = new Hono();

demo.get('/demo', (c) => c.html(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VoiceDOT Demo</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 20px auto; padding: 0 12px; }
    button { padding: 8px 12px; margin-right: 8px; }
    textarea, input { width: 100%; margin: 8px 0; }
    .row { margin: 12px 0; }
    audio { width: 100%; margin: 8px 0; }
  </style>
</head>
<body>
  <h1>VoiceDOT Demo</h1>
  <div class="row">
    <label>Wallet Address</label>
    <input id="wallet" placeholder="polkadot address" />
  </div>
  <div class="row">
    <button id="rec">Start Recording</button>
    <button id="stop" disabled>Stop</button>
  </div>
  <div class="row">
    <button id="send" disabled>Send to /voice/process</button>
    <button id="confirm" disabled>Send to /voice/confirm</button>
  </div>
  <div class="row">
    <label>Log</label>
    <textarea id="log" rows="10"></textarea>
  </div>
  <audio id="player" controls></audio>

<script>
let mediaRecorder, chunks = [];
let lastTransactionIds = [];

function log(msg) {
  const el = document.getElementById('log');
  el.value += msg + '\n';
  el.scrollTop = el.scrollHeight;
}

async function getBlobBase64(blob) {
  const buf = await blob.arrayBuffer();
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i=0; i<bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

document.getElementById('rec').onclick = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
  chunks = [];
  mediaRecorder.ondataavailable = e => chunks.push(e.data);
  mediaRecorder.onstop = () => {
    document.getElementById('send').disabled = false;
    document.getElementById('confirm').disabled = false;
  };
  mediaRecorder.start();
  document.getElementById('rec').disabled = true;
  document.getElementById('stop').disabled = false;
  log('Recording...');
};

document.getElementById('stop').onclick = () => {
  mediaRecorder.stop();
  document.getElementById('rec').disabled = false;
  document.getElementById('stop').disabled = true;
  log('Stopped');
};

document.getElementById('send').onclick = async () => {
  const wallet = document.getElementById('wallet').value.trim();
  const blob = new Blob(chunks, { type: 'audio/webm' });
  const base64 = await getBlobBase64(blob);
  const res = await fetch('/voice/process', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ audio_data: base64, user_id: wallet || 'demo', format: 'webm' })
  });
  const data = await res.json();
  log(JSON.stringify(data, null, 2));
  lastTransactionIds = data.transaction_ids || (data.transaction_id ? [data.transaction_id] : []);
  if (data.confirmation?.audio_base64) {
    const src = 'data:audio/mp3;base64,' + data.confirmation.audio_base64;
    document.getElementById('player').src = src;
    document.getElementById('player').play();
  }
};

document.getElementById('confirm').onclick = async () => {
  const wallet = document.getElementById('wallet').value.trim();
  const blob = new Blob(chunks, { type: 'audio/webm' });
  const base64 = await getBlobBase64(blob);
  const res = await fetch('/voice/confirm', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ audio_data: base64, user_id: wallet || 'demo', transaction_ids: lastTransactionIds })
  });
  const data = await res.json();
  log(JSON.stringify(data, null, 2));
  if (data.response?.audio_base64) {
    const src = 'data:audio/mp3;base64,' + data.response.audio_base64;
    document.getElementById('player').src = src;
    document.getElementById('player').play();
  }
};
</script>
</body>
</html>`));