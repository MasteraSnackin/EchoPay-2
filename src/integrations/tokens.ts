export type SupportedToken = 'DOT' | 'USDT' | 'GLMR';
export type ChainName = 'polkadot' | 'asset-hub-polkadot' | 'moonbeam';

export interface TokenInfo {
  symbol: SupportedToken;
  chain: ChainName; // canonical chain where the token is native/managed
  isNative: boolean;
  decimals: number;
  assetId?: number; // for pallet-assets tokens on Asset Hub
}

const TOKENS: Record<SupportedToken, TokenInfo> = {
  DOT: { symbol: 'DOT', chain: 'polkadot', isNative: true, decimals: 10 },
  USDT: { symbol: 'USDT', chain: 'asset-hub-polkadot', isNative: false, assetId: 1984, decimals: 6 },
  GLMR: { symbol: 'GLMR', chain: 'moonbeam', isNative: true, decimals: 18 },
};

export function getTokenInfo(symbol: string): TokenInfo | undefined {
  const s = symbol.toUpperCase() as SupportedToken;
  return TOKENS[s];
}