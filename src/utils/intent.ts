import { z } from 'zod';

export const IntentItemSchema = z.object({
  action: z.literal('transfer'),
  amount: z.string(),
  token: z.string(),
  recipient: z.string(),
  origin_chain: z.string(),
  destination_chain: z.string(),
});

export const IntentSchema = z.object({
  type: z.enum(['single', 'batch']).default('single'),
  language: z.string().optional().default('en'),
  items: z.array(IntentItemSchema).min(1),
  schedule: z.string().nullable().optional().default(null),
  condition: z.string().nullable().optional().default(null),
});

export type Intent = z.infer<typeof IntentSchema>;
export type IntentItem = z.infer<typeof IntentItemSchema>;