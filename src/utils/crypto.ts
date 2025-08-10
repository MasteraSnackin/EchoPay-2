import { base64ToUint8Array, uint8ArrayToBase64, base64ToArrayBuffer, arrayBufferToBase64 } from './base64';

export async function encryptAesGcm(keyBase64: string | undefined, data: ArrayBuffer): Promise<{ iv: string; ciphertext: string }> {
  if (!keyBase64) {
    return { iv: '', ciphertext: arrayBufferToBase64(data) };
  }
  const keyRaw = base64ToUint8Array(keyBase64);
  const cryptoKey = await crypto.subtle.importKey('raw', keyRaw, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, data);
  return { iv: uint8ArrayToBase64(iv), ciphertext: arrayBufferToBase64(encrypted) };
}

export async function decryptAesGcm(keyBase64: string | undefined, ivBase64: string, ciphertextBase64: string): Promise<ArrayBuffer> {
  if (!keyBase64) {
    return base64ToArrayBuffer(ciphertextBase64);
  }
  const keyRaw = base64ToUint8Array(keyBase64);
  const iv = base64ToUint8Array(ivBase64);
  const data = base64ToUint8Array(ciphertextBase64);
  const cryptoKey = await crypto.subtle.importKey('raw', keyRaw, 'AES-GCM', false, ['decrypt']);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, data);
}