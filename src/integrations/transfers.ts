import { getApiForChain, type ChainName } from './chains';
import { getTokenInfo } from './tokens';
import { decimalToUnits } from '../utils/units';

export async function buildNativeTransfer(chain: ChainName, tokenSymbol: string, recipient: string, amountHuman: string) {
  const info = getTokenInfo(tokenSymbol);
  if (!info) throw new Error(`Unsupported token ${tokenSymbol}`);
  const api = await getApiForChain(chain);
  const amountUnits = decimalToUnits(amountHuman, info.decimals);
  if (info.isNative) {
    return api.tx.balances.transferKeepAlive(recipient, amountUnits);
  }
  throw new Error('Token is not native on this chain');
}

export async function buildAssetHubUsdtTransfer(recipient: string, amountHuman: string) {
  const info = getTokenInfo('USDT')!;
  const api = await getApiForChain('asset-hub-polkadot');
  const amountUnits = decimalToUnits(amountHuman, info.decimals);
  const assetId = info.assetId!;
  return (api.tx as any).assets.transfer(assetId, recipient, amountUnits);
}