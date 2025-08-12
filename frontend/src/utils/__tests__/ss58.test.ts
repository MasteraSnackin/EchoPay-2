import { describe, it, expect, beforeAll } from 'vitest';
import { isValidSs58WithPrefix, normalizeToPrefix } from '../../utils/ss58';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/keyring';

const WESTEND_PREFIX = 42;

describe('SS58 utilities', () => {
  beforeAll(async () => {
    await cryptoWaitReady();
  });

  it('normalizes address to Westend prefix', () => {
    const keyring = new Keyring({ type: 'sr25519' });
    const pair = keyring.addFromUri('//Alice');
    const substrateAddr = pair.address; // default ss58 for dev

    const normalized = normalizeToPrefix(substrateAddr, WESTEND_PREFIX);
    expect(typeof normalized).toBe('string');
    expect(normalized && isValidSs58WithPrefix(normalized, WESTEND_PREFIX)).toBe(true);
  });

  it('rejects invalid address for Westend prefix', () => {
    const bad = 'invalid-address';
    expect(isValidSs58WithPrefix(bad, WESTEND_PREFIX)).toBe(false);
    expect(normalizeToPrefix(bad, WESTEND_PREFIX)).toBeNull();
  });
});