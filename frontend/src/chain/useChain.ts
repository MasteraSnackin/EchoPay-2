import { useCallback, useMemo, useRef } from 'react';
import type { ApiPromise } from '@polkadot/api';
import { useApi } from './ApiProvider';

interface CacheEntry<T> {
  value: T;
  ts: number;
}

const DEFAULT_TTL_MS = 15_000;

export function useChain() {
  const { api, ready, decimals } = useApi();

  const balanceCache = useRef<Map<string, CacheEntry<bigint>>>(new Map());
  const feeCache = useRef<Map<string, CacheEntry<bigint>>>(new Map());

  const isReady = !!api && ready && decimals != null;

  const getBalancePlanck = useCallback(async (address: string, ttlMs: number = DEFAULT_TTL_MS): Promise<{ value: bigint; cacheHit: boolean }> => {
    if (!api) throw new Error('API not ready');
    const now = Date.now();
    const cached = balanceCache.current.get(address);
    if (cached && now - cached.ts < ttlMs) {
      return { value: cached.value, cacheHit: true };
    }
    const account: any = await api.query.system.account(address);
    const free = BigInt(account.data.free.toString());
    balanceCache.current.set(address, { value: free, ts: now });
    return { value: free, cacheHit: false };
  }, [api]);

  const estimateTransferFeePlanck = useCallback(async (
    fromAddress: string,
    toAddress: string,
    amountPlanck: bigint,
    ttlMs: number = DEFAULT_TTL_MS
  ): Promise<{ value: bigint; cacheHit: boolean }> => {
    if (!api) throw new Error('API not ready');
    const key = `${fromAddress}:${toAddress}:${amountPlanck.toString()}`;
    const now = Date.now();
    const cached = feeCache.current.get(key);
    if (cached && now - cached.ts < ttlMs) {
      return { value: cached.value, cacheHit: true };
    }
    const tx = api.tx.balances.transferKeepAlive(toAddress, amountPlanck);
    const info = await tx.paymentInfo(fromAddress);
    const fee = BigInt((info.partialFee as any).toString());
    feeCache.current.set(key, { value: fee, ts: now });
    return { value: fee, cacheHit: false };
  }, [api]);

  const invalidate = useCallback((pattern?: RegExp) => {
    if (!pattern) {
      balanceCache.current.clear();
      feeCache.current.clear();
      return;
    }
    for (const k of balanceCache.current.keys()) {
      if (pattern.test(k)) balanceCache.current.delete(k);
    }
    for (const k of feeCache.current.keys()) {
      if (pattern.test(k)) feeCache.current.delete(k);
    }
  }, []);

  return useMemo(() => ({
    api: api as ApiPromise | null,
    ready: isReady,
    decimals: decimals as number | null,
    getBalancePlanck,
    estimateTransferFeePlanck,
    invalidate,
  }), [api, isReady, decimals, getBalancePlanck, estimateTransferFeePlanck, invalidate]);
}