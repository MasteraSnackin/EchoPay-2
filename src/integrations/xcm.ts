import { getApiForChain, type ChainName } from './chains';

export interface XcmTransferRequest {
  origin: ChainName;
  destination: ChainName;
  asset: { symbol: 'USDT' | 'DOT' | 'GLMR'; assetId?: number };
  amount: string; // planck or smallest units as string
  sender: string;
  recipient: string;
  minReceive?: string; // planck of destination asset as safeguard
}

export async function buildDotTeleport(req: XcmTransferRequest) {
  const api = await getApiForChain(req.origin);
  const isRelayToHub = req.origin === 'polkadot' && req.destination === 'asset-hub-polkadot';
  const isHubToRelay = req.origin === 'asset-hub-polkadot' && req.destination === 'polkadot';
  if (!isRelayToHub && !isHubToRelay) throw new Error('DOT teleport supported only between polkadot and asset-hub-polkadot');
  const dest = isRelayToHub
    ? { V3: { parents: 0, interior: { X1: { Parachain: 1000 } } } }
    : { V3: { parents: 1, interior: { X1: { AccountId32: { id: req.recipient, network: null } } } } }; // not used as dest, fix below
  const destFinal = isRelayToHub
    ? dest
    : { V3: { parents: 1, interior: { Here: null } } } as any;
  const beneficiary = { V3: { parents: 0, interior: { X1: { AccountId32: { id: req.recipient, network: null } } } } };
  const assets = { V3: [ { id: { Concrete: isRelayToHub ? { parents: 0, interior: { Here: null } } : { parents: 0, interior: { Here: null } } }, fun: { Fungible: req.amount } } ] } as any;
  const feeAssetItem = 0;
  const weightLimit = 'Unlimited' as any;
  return (api.tx as any).xcmPallet.limitedTeleportAssets(destFinal, beneficiary, assets, feeAssetItem, weightLimit);
}

export async function buildUsdtReserveTransferFromAssetHubToMoonbeam(req: XcmTransferRequest) {
  if (!(req.origin === 'asset-hub-polkadot' && req.destination === 'moonbeam')) throw new Error('USDT transfer supported only Asset Hub -> Moonbeam in this builder');
  const api = await getApiForChain(req.origin);
  const dest = { V3: { parents: 1, interior: { X1: { Parachain: 2004 } } } }; // Moonbeam para id
  const beneficiary = { V3: { parents: 0, interior: { X1: { AccountId32: { id: req.recipient, network: null } } } } };
  const assets = { V3: [ { id: { Concrete: { parents: 0, interior: { X2: [ { PalletInstance: 50 }, { GeneralIndex: req.asset.assetId ?? 1984 } ] } } }, fun: { Fungible: req.amount } } ] } as any;
  const feeAssetItem = 0;
  const weightLimit = 'Unlimited' as any;
  return (api.tx as any).xcmPallet.limitedReserveTransferAssets(dest, beneficiary, assets, feeAssetItem, weightLimit);
}

export async function buildXcmTransferExtrinsic(req: XcmTransferRequest) {
  if (req.asset.symbol === 'DOT') {
    return buildDotTeleport(req);
  }
  if (req.asset.symbol === 'USDT' && req.origin === 'asset-hub-polkadot' && req.destination === 'moonbeam') {
    return buildUsdtReserveTransferFromAssetHubToMoonbeam(req);
  }
  // Fallback generic builder (may need adjustments per route)
  const api = await getApiForChain(req.origin);
  const dest = { V3: { parents: req.origin === 'polkadot' ? 0 : 1, interior: { X1: { Parachain: req.destination === 'asset-hub-polkadot' ? 1000 : 2004 } } } } as any;
  const beneficiary = { V3: { parents: 0, interior: { X1: { AccountId32: { id: req.recipient, network: null } } } } } as any;
  const assets = { V3: [ { id: { Concrete: { parents: 0, interior: { X2: [ { PalletInstance: 50 }, { GeneralIndex: req.asset.assetId ?? 0 } ] } } }, fun: { Fungible: req.amount } } ] } as any;
  const feeAssetItem = 0;
  const weightLimit = 'Unlimited' as any;
  return (api.tx as any).xcmPallet.limitedReserveTransferAssets(dest, beneficiary, assets, feeAssetItem, weightLimit);
}

export async function estimateXcmFee(req: XcmTransferRequest): Promise<string> {
  const extrinsic = await buildXcmTransferExtrinsic(req);
  try {
    const info = await (extrinsic as any).paymentInfo(req.sender || req.recipient);
    return String(info.partialFee?.toString?.() ?? '0');
  } catch (e) {
    return '0';
  }
}