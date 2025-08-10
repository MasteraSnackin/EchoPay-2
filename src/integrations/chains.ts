import { ApiPromise, WsProvider } from '@polkadot/api';
import type { Env } from '../db/client';

export type ChainName = 'polkadot' | 'asset-hub-polkadot' | 'moonbeam';

const DEFAULT_ENDPOINTS: Record<ChainName, string> = {
  polkadot: 'wss://rpc.polkadot.io',
  'asset-hub-polkadot': 'wss://polkadot-asset-hub-rpc.polkadot.io',
  moonbeam: 'wss://wss.api.moonbeam.network',
};

const apiCache = new Map<string, Promise<ApiPromise>>();

export async function getApiForChain(chain: ChainName, overrideEndpoint?: string, env?: Env): Promise<ApiPromise> {
  const endpoint = overrideEndpoint
    || (env && chain === 'polkadot' && env.POLKADOT_RPC_ENDPOINT)
    || (env && chain === 'asset-hub-polkadot' && env.ASSETHUB_RPC_ENDPOINT)
    || (env && chain === 'moonbeam' && env.MOONBEAM_RPC_ENDPOINT)
    || DEFAULT_ENDPOINTS[chain];
  if (!apiCache.has(endpoint)) {
    const provider = new WsProvider(endpoint);
    apiCache.set(endpoint, ApiPromise.create({ provider }));
  }
  return apiCache.get(endpoint)!;
}

export function getDefaultEndpointForChain(chain: ChainName): string {
  return DEFAULT_ENDPOINTS[chain];
}