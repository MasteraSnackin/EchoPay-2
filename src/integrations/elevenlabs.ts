import { Env } from '../db/client';
import { base64ToUint8Array } from '../utils/base64';

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort('timeout'), ms);
  try {
    // @ts-ignore
    const res = await promise;
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function speechToText(env: Env, audioBase64: string, format: string): Promise<string> {
  const audioBytes = base64ToUint8Array(audioBase64);
  const filename = `audio.${format || 'webm'}`;
  // Prefer multipart form upload for better compatibility
  const form = new FormData();
  form.append('file', new Blob([audioBytes], { type: 'application/octet-stream' }), filename);
  // Optional: pass model or language hints
  form.append('model_id', 'eleven_multilingual_v2');

  const req = fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: {
      'xi-api-key': env.ELEVENLABS_API_KEY,
    },
    body: form,
  });
  const res = await withTimeout(req, 30000);
  if (!res.ok) throw new Error(`STT failed: ${res.status}`);
  const data = await res.json<any>();
  return data.text ?? '';
}

export async function textToSpeech(env: Env, text: string): Promise<ArrayBuffer> {
  const voiceId = env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
  });
  if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
  return await res.arrayBuffer();
}