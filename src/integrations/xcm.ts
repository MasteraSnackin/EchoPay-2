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
  const dest = { V3: { parents: 1, interior: { X1: { Parachain: 1000 } } } };
  const beneficiary = { V3: { parents: 0, interior: { X1: { AccountId32: { id: req.recipient, network: null } } } } };
  const assets = { V3: [ { id: { Concrete: { parents: 0, interior: { X2: [ { PalletInstance: 50 }, { GeneralIndex: req.asset.assetId ?? 0 } ] } } }, fun: { Fungible: req.amount } } ] };
  const feeAssetItem = 0;
  const weightLimit = 'Unlimited';
  const extrinsic = (api.tx as any).xcmPallet.limitedReserveTransferAssets(dest, beneficiary, assets, feeAssetItem, weightLimit);
  return extrinsic;
}

export async function estimateXcmFee(req: XcmTransferRequest): Promise<string> {
  const extrinsic = await buildXcmTransferExtrinsic(req);
  // NOTE: paymentInfo requires signer/address; for Workers we use a dummy address to get weight/partial fee when supported
  try {
    const info = await (extrinsic as any).paymentInfo(req.sender || req.recipient);
    return String(info.partialFee?.toString?.() ?? '0');
  } catch (e) {
    return '0';
  }
}