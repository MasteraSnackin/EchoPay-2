import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

export function isValidSs58WithPrefix(address: string, prefix: number): boolean {
  try {
    const publicKey = decodeAddress(address);
    const reencoded = encodeAddress(publicKey, prefix);
    return reencoded === address;
  } catch {
    return false;
  }
}

export function normalizeToPrefix(address: string, prefix: number): string | null {
  try {
    const publicKey = decodeAddress(address);
    return encodeAddress(publicKey, prefix);
  } catch {
    return null;
  }
}