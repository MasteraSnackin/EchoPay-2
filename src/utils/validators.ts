import { z } from 'zod';

export const VoiceProcessSchema = z.object({
  audio_data: z.string().min(1),
  user_id: z.string().min(1),
  format: z.enum(['mp3', 'wav', 'webm']).optional().default('webm'),
});

export const VoiceConfirmSchema = z.object({
  audio_data: z.string().min(1),
  user_id: z.string().min(1),
  transaction_id: z.string().uuid().optional(),
  transaction_ids: z.array(z.string().uuid()).optional(),
}).refine((d) => !!d.transaction_id || (d.transaction_ids && d.transaction_ids.length > 0), {
  message: 'transaction_id or transaction_ids required',
});

export const ExecuteTxSchema = z.object({
  transaction_id: z.string().uuid(),
  signed_extrinsic: z.string().regex(/^[0-9a-fA-F]+$/),
  chain: z.enum(['polkadot', 'asset-hub-polkadot', 'moonbeam']).optional(),
  token: z.string().optional(),
  min_receive: z.string().optional(),
  slippage_bps: z.number().int().min(0).max(10000).optional(),
});

export const WalletConnectSchema = z.object({
  wallet_address: z.string().min(1),
  signature: z.string().min(1),
  message: z.string().min(1),
});

export const WalletBalanceSchema = z.object({
  wallet_address: z.string().min(1),
  token_symbols: z.string().optional(), // CSV of symbols
});