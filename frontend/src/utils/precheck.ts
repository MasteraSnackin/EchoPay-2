export interface PrecheckParams {
  amountPlanck: bigint;
  balancePlanck: bigint;
  feePlanck: bigint;
  existentialDeposit?: bigint | null;
}

export interface PrecheckResult {
  ok: boolean;
  error?: string;
  warnings: string[];
  required?: bigint;
  remaining?: bigint;
}

export function precheckTransfer(params: PrecheckParams): PrecheckResult {
  const { amountPlanck, balancePlanck, feePlanck, existentialDeposit } = params;
  const required = amountPlanck + feePlanck;

  if (balancePlanck < required) {
    return {
      ok: false,
      error: 'Insufficient balance for amount + estimated fee.',
      warnings: [],
      required,
      remaining: balancePlanck - required,
    };
  }

  const remaining = balancePlanck - required;
  const warnings: string[] = [];
  if (existentialDeposit != null && remaining < existentialDeposit) {
    warnings.push('Warning: Remaining balance may fall below existential deposit (reaping risk).');
  }

  return { ok: true, warnings, required, remaining };
}