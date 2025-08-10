import { Env } from '../db/client';
import { ApiPromise, WsProvider } from '@polkadot/api';

let apiPromise: Promise<ApiPromise> | null = null;

export async function getApi(env: Env): Promise<ApiPromise> {
  if (!apiPromise) {
    const provider = new WsProvider(env.POLKADOT_RPC_ENDPOINT);
    apiPromise = ApiPromise.create({ provider });
  }
  return apiPromise;
}

export async function getBalance(env: Env, address: string): Promise<string> {
  const api = await getApi(env);
  const { data } = await api.query.system.account(address);
  return data.free.toString();
}

export async function submitExtrinsic(env: Env, signedExtrinsicHex: string): Promise<string> {
  const api = await getApi(env);
  const hash = await api.rpc.author.submitExtrinsic(`0x${signedExtrinsicHex}`);
  return hash.toString();
}