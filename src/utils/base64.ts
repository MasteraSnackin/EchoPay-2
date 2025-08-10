export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  return uint8ArrayToBase64(new Uint8Array(buf));
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  return base64ToUint8Array(base64).buffer;
}