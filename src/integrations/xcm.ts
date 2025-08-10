import { getApiForChain, type ChainName } from './chains';

export interface XcmTransferRequest {
  origin: ChainName;
  destination: ChainName;
  asset: { symbol: 'USDT' | 'DOT' | 'GLMR'; assetId?: number };
  amount: string; // planck or smallest units as string
  sender: string;
  recipient: string;
}

export async function buildXcmTransferExtrinsic(req: XcmTransferRequest) {
  const api = await getApiForChain(req.origin);
  // NOTE: This is a placeholder. Proper XCM calls depend on chain runtimes.
  // For Asset Hub USDT to Polkadot account, typically use xcmPallet.limitedReserveTransferAssets / limitedTeleportAssets
  const dest = { V3: { parents: 1, interior: { X1: { Parachain: 1000 } } } };
  const beneficiary = { V3: { parents: 0, interior: { X1: { AccountId32: { id: req.recipient, network: null } } } } };
  const assets = { V3: [ { id: { Concrete: { parents: 0, interior: { X2: [ { PalletInstance: 50 }, { GeneralIndex: req.asset.assetId ?? 0 } ] } } }, fun: { Fungible: req.amount } } ] };
  const feeAssetItem = 0;
  const weightLimit = 'Unlimited';
  const extrinsic = (api.tx as any).xcmPallet.limitedReserveTransferAssets(dest, beneficiary, assets, feeAssetItem, weightLimit);
  return extrinsic;
}