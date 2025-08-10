import { ApiPromise, WsProvider } from '@polkadot/api';

export type ChainName = 'polkadot' | 'asset-hub-polkadot' | 'moonbeam';

const DEFAULT_ENDPOINTS: Record<ChainName, string> = {
  polkadot: 'wss://rpc.polkadot.io',
  'asset-hub-polkadot': 'wss://polkadot-asset-hub-rpc.polkadot.io',
  moonbeam: 'wss://wss.api.moonbeam.network',
};

const apiCache = new Map<string, Promise<ApiPromise>>();

export async function getApiForChain(chain: ChainName, overrideEndpoint?: string): Promise<ApiPromise> {
  const endpoint = overrideEndpoint || DEFAULT_ENDPOINTS[chain];
  if (!apiCache.has(endpoint)) {
    const provider = new WsProvider(endpoint);
    apiCache.set(endpoint, ApiPromise.create({ provider }));
  }
  return apiCache.get(endpoint)!;
}

export function getDefaultEndpointForChain(chain: ChainName): string {
  return DEFAULT_ENDPOINTS[chain];
}