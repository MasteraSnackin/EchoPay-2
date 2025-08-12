import { describe, it, expect } from 'vitest';
import { parseCommandText } from '../../utils/parseCommand';

describe('parseCommandText', () => {
  it('parses basic pay command', () => {
    const parsed = parseCommandText('Pay 1 WND to Alice');
    expect(parsed).not.toBeNull();
    expect(parsed!.action).toBe('pay');
    expect(parsed!.amount).toBe(1);
    expect(parsed!.token).toBe('WND');
    expect(parsed!.recipientName).toBe('Alice');
  });

  it('parses send command with decimals and dot token', () => {
    const parsed = parseCommandText('send 2.5 dot to bob');
    expect(parsed).not.toBeNull();
    expect(parsed!.action).toBe('send');
    expect(parsed!.amount).toBe(2.5);
    expect(parsed!.token).toBe('DOT');
    expect(parsed!.recipientName).toBe('Bob');
  });

  it('returns null on invalid command', () => {
    const parsed = parseCommandText('hello world');
    expect(parsed).toBeNull();
  });

  it('limits token to letters 2-5 length and ignores invalid', () => {
    const parsed = parseCommandText('pay 10 W to alice');
    expect(parsed).toBeNull();
  });
});