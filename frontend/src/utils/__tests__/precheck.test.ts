import { describe, it, expect } from 'vitest';
import { precheckTransfer } from '../../utils/precheck';

describe('precheckTransfer', () => {
  it('fails when balance is insufficient', () => {
    const res = precheckTransfer({ amountPlanck: 100n, feePlanck: 50n, balancePlanck: 120n, existentialDeposit: 10n });
    expect(res.ok).toBe(false);
    expect(res.error).toBeDefined();
  });

  it('warns when remaining below existential deposit', () => {
    const res = precheckTransfer({ amountPlanck: 90n, feePlanck: 5n, balancePlanck: 100n, existentialDeposit: 10n });
    expect(res.ok).toBe(true);
    expect(res.warnings.length).toBeGreaterThan(0);
  });

  it('ok when balance sufficient and remaining above ED', () => {
    const res = precheckTransfer({ amountPlanck: 50n, feePlanck: 5n, balancePlanck: 100n, existentialDeposit: 10n });
    expect(res.ok).toBe(true);
    expect(res.warnings.length).toBe(0);
  });
});