import { Env } from '../db/client';
import { base64ToUint8Array } from '../utils/base64';

export async function speechToText(env: Env, audioBase64: string, format: string): Promise<string> {
  const audioBytes = base64ToUint8Array(audioBase64);
  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: {
      'xi-api-key': env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/octet-stream',
    },
    body: audioBytes,
  });
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