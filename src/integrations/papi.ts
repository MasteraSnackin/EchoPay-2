import { Env } from '../db/client';
import { getApiForChain, type ChainName, getDefaultEndpointForChain } from './chains';

export async function getBalance(env: Env, address: string, chain: ChainName = 'polkadot'): Promise<string> {
  const api = await getApiForChain(chain, undefined, env);
  const { data } = await api.query.system.account(address);
  return data.free.toString();
}

export async function submitExtrinsic(env: Env, signedExtrinsicHex: string, chain: ChainName = 'polkadot'): Promise<string> {
  const api = await getApiForChain(chain, undefined, env);
  const hash = await api.rpc.author.submitExtrinsic(`0x${signedExtrinsicHex}`);
  return hash.toString();
}