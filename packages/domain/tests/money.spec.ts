import { describe, it, expect } from 'vitest';
import { createMoney, addMoney, subtractMoney } from '../src/money.js';

describe('Monetary Minor Units Invariants', () => {
  it('creates money value objects with integer minor units', () => {
    const price = createMoney(50000, 'NGN');
    expect(price.amount_minor).toBe(50000n);
    expect(price.currency_code).toBe('NGN');
  });

  it('correctly adds monetary amounts of matching currencies', () => {
    const a = createMoney(1250, 'USD');
    const b = createMoney(3750, 'USD');
    const sum = addMoney(a, b);
    expect(sum.amount_minor).toBe(5000n);
    expect(sum.currency_code).toBe('USD');
  });

  it('correctly subtracts monetary amounts of matching currencies', () => {
    const a = createMoney(10000, 'NGN');
    const b = createMoney(4500, 'NGN');
    const diff = subtractMoney(a, b);
    expect(diff.amount_minor).toBe(5500n);
    expect(diff.currency_code).toBe('NGN');
  });

  it('throws an error when adding different currencies without explicit exchange conversion', () => {
    const usd = createMoney(100, 'USD');
    const ngn = createMoney(150000, 'NGN');
    expect(() => addMoney(usd, ngn)).toThrowError(/Cannot add different currencies/);
  });
});
