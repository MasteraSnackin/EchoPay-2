import { z } from 'zod';

export const VoiceProcessSchema = z.object({
  audio_data: z.string().min(1),
  user_id: z.string().min(1),
  format: z.enum(['mp3', 'wav', 'webm']).optional().default('webm'),
});

export const VoiceConfirmSchema = z.object({
  audio_data: z.string().min(1),
  transaction_id: z.string().uuid(),
  user_id: z.string().min(1),
});

export const ExecuteTxSchema = z.object({
  transaction_id: z.string().uuid(),
  signed_extrinsic: z.string().regex(/^[0-9a-fA-F]+$/),
});

export const WalletConnectSchema = z.object({
  wallet_address: z.string().min(1),
  signature: z.string().min(1),
  message: z.string().min(1),
});

export const WalletBalanceSchema = z.object({
  wallet_address: z.string().min(1),
  token_symbols: z.string().optional(),
});