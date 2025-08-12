export async function elevenLabsSTT(apiKey: string, audioData: string, format: string = 'mp3'): Promise<string> {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio_data: audioData,
        model_id: 'eleven_english_sts_v2',
        output_format: format
      })
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs STT failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.text || '';
  } catch (error) {
    console.error('ElevenLabs STT error:', error);
    throw new Error(`STT processing failed: ${error.message}`);
  }
}

export async function elevenLabsTTS(apiKey: string, text: string, voiceId: string = '21m00Tcm4TlvDq8ikWAM'): Promise<ArrayBuffer> {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs TTS failed: ${response.statusText}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    throw new Error(`TTS processing failed: ${error.message}`);
  }
}