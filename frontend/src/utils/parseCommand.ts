export interface ParsedCommand {
  action: 'pay' | 'send';
  amount: number;
  token: string; // e.g., WND, DOT
  recipientName?: string;
  recipientAddress?: string;
}

// Very simple parser for commands like:
// "Pay 1 WND to Alice" or "send 2.5 DOT to Bob"
export function parseCommandText(commandText: string): ParsedCommand | null {
  if (!commandText) return null;

  const text = commandText.trim().toLowerCase();

  // Regex groups: action, amount, token, recipient name
  const match = text.match(/\b(pay|send)\s+([\d,.]+)\s+([a-zA-Z]{2,5})\s+(?:to|for)\s+([a-zA-Z][a-zA-Z0-9_-]*)\b/);
  if (!match) return null;

  const [, actionRaw, amountRaw, tokenRaw, recipientRaw] = match;
  const amount = Number((amountRaw || '').replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const token = tokenRaw.toUpperCase();

  return {
    action: actionRaw === 'pay' ? 'pay' : 'send',
    amount,
    token,
    recipientName: capitalize(recipientRaw),
  };
}

function capitalize(input: string): string {
  if (!input) return input;
  return input.charAt(0).toUpperCase() + input.slice(1);
}