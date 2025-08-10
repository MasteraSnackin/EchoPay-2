import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

export function isValidSs58Address(address: string): boolean {
  try {
    const pub = decodeAddress(address);
    // Re-encode to ensure format is canonical; if encode works, it's valid
    encodeAddress(pub);
    return true;
  } catch {
    return false;
  }
}