import { getApiForChain } from './chains';
import { getTokenInfo, SupportedToken } from './tokens';

export async function getTokenBalance(address: string, symbol: SupportedToken): Promise<string> {
  const info = getTokenInfo(symbol)!;
  const api = await getApiForChain(info.chain);

  if (symbol === 'DOT' || symbol === 'GLMR') {
    const { data } = await api.query.system.account(address);
    return data.free.toString();
  }

  if (symbol === 'USDT') {
    // Asset Hub USDT via pallet-assets; using known assetId
    const assetId = info.assetId!;
    const account = await (api.query as any).assets.account(assetId, address);
    // account holds { balance, isFrozen, reason, extra }
    const json = account.toJSON() as any;
    const balance = json?.balance ?? '0';
    return String(balance);
  }

  return '0';
}