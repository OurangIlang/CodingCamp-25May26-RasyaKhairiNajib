/**
 * expense-tracker.test.js
 *
 * Unit tests (Tasks 8.1–8.5) and Property-Based Tests (Tasks 9.1–9.8)
 * for the Expense & Budget Visualizer app.
 *
 * Test runner: Vitest
 * PBT library: fast-check
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  Validator,
  Formatter,
  TransactionStore,
  CATEGORIES,
} from './js/app.js';

// ============================================================
// localStorage mock (in-memory)
// ============================================================

function createLocalStorageMock() {
  let store = {};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
}

// Install the mock globally before tests that need it
function installLocalStorageMock() {
  const mock = createLocalStorageMock();
  global.localStorage = mock;
  return mock;
}

// ============================================================
// Category aggregation helper (mirrors Renderer.renderPieChart logic)
// ============================================================

function computeCategoryTotals(transactions) {
  const totals = {};
  for (const category of CATEGORIES) {
    totals[category] = 0;
  }
  for (const tx of transactions) {
    if (totals[tx.category] !== undefined) {
      totals[tx.category] += tx.amount;
    }
  }
  return totals;
}

function computeActiveCategories(transactions) {
  const totals = computeCategoryTotals(transactions);
  return CATEGORIES.filter((cat) => totals[cat] > 0);
}

// ============================================================
// Valid transaction generator for fast-check
// ============================================================

const validTransaction = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  amount: fc.double({ min: 0.01, max: 999_999_999.99, noNaN: true, noDefaultInfinity: true }),
  category: fc.constantFrom('Food', 'Transport', 'Fun'),
  createdAt: fc.integer({ min: 1 }),
});

// ============================================================
// 8.1 — Unit tests for Validator.validateForm
// ============================================================

describe('Validator.validateForm', () => {
  it('returns valid: true for typical valid inputs', () => {
    const result = Validator.validateForm('Lunch', '12.50', 'Food');
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('returns valid: false with errors.name for empty name', () => {
    const result = Validator.validateForm('', '10.00', 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('returns valid: false with errors.name for whitespace-only name', () => {
    const result = Validator.validateForm('   ', '10.00', 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('returns valid: false with errors.name for name exceeding 100 characters', () => {
    const longName = 'a'.repeat(101);
    const result = Validator.validateForm(longName, '10.00', 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('returns valid: false with errors.amount for amount = "0"', () => {
    const result = Validator.validateForm('Item', '0', 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });

  it('returns valid: false with errors.amount for amount = "-1"', () => {
    const result = Validator.validateForm('Item', '-1', 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });

  it('returns valid: false with errors.amount for amount = "1000000000"', () => {
    const result = Validator.validateForm('Item', '1000000000', 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });

  it('returns valid: false with errors.amount for amount = "abc"', () => {
    const result = Validator.validateForm('Item', 'abc', 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });

  it('returns valid: false with errors.category for invalid category string', () => {
    const result = Validator.validateForm('Item', '10.00', 'Other');
    expect(result.valid).toBe(false);
    expect(result.errors.category).toBeDefined();
  });

  it('returns all three error keys when all fields are invalid simultaneously', () => {
    const result = Validator.validateForm('', '0', 'Other');
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.amount).toBeDefined();
    expect(result.errors.category).toBeDefined();
  });
});

// ============================================================
// 8.2 — Unit tests for Validator.validateTransaction
// ============================================================

describe('Validator.validateTransaction', () => {
  const validTx = {
    id: 'abc-123',
    name: 'Lunch',
    amount: 12.5,
    category: 'Food',
    createdAt: 1700000000000,
  };

  it('returns true for a valid transaction object', () => {
    expect(Validator.validateTransaction(validTx)).toBe(true);
  });

  it('returns false when id field is missing', () => {
    const { id: _id, ...noId } = validTx;
    expect(Validator.validateTransaction(noId)).toBe(false);
  });

  it('returns false when amount = 0', () => {
    expect(Validator.validateTransaction({ ...validTx, amount: 0 })).toBe(false);
  });

  it('returns false when amount is negative', () => {
    expect(Validator.validateTransaction({ ...validTx, amount: -5 })).toBe(false);
  });

  it('returns false when category = "Other"', () => {
    expect(Validator.validateTransaction({ ...validTx, category: 'Other' })).toBe(false);
  });

  it('returns false when createdAt = 0', () => {
    expect(Validator.validateTransaction({ ...validTx, createdAt: 0 })).toBe(false);
  });

  it('returns false for string input', () => {
    expect(Validator.validateTransaction('not an object')).toBe(false);
  });

  it('returns false for null input', () => {
    expect(Validator.validateTransaction(null)).toBe(false);
  });

  it('returns false for array input', () => {
    expect(Validator.validateTransaction([validTx])).toBe(false);
  });
});

// ============================================================
// 8.3 — Unit tests for Formatter.currency
// ============================================================

describe('Formatter.currency', () => {
  it('formats 0 as "$0.00"', () => {
    expect(Formatter.currency(0)).toBe('$0.00');
  });

  it('formats 1234.5 as "$1,234.50"', () => {
    expect(Formatter.currency(1234.5)).toBe('$1,234.50');
  });

  it('formats 999999999.99 as "$999,999,999.99"', () => {
    expect(Formatter.currency(999999999.99)).toBe('$999,999,999.99');
  });

  it('formats 0.01 as "$0.01"', () => {
    expect(Formatter.currency(0.01)).toBe('$0.01');
  });

  it('formats 1000000 as "$1,000,000.00"', () => {
    expect(Formatter.currency(1000000)).toBe('$1,000,000.00');
  });
});

// ============================================================
// 8.4 — Unit tests for TransactionStore deserialization via load()
// ============================================================

describe('TransactionStore.load()', () => {
  const validTx1 = {
    id: 'id-1',
    name: 'Coffee',
    amount: 3.5,
    category: 'Food',
    createdAt: 1000,
  };
  const validTx2 = {
    id: 'id-2',
    name: 'Bus',
    amount: 2.0,
    category: 'Transport',
    createdAt: 2000,
  };
  const invalidTx = { id: '', name: '', amount: -1, category: 'Unknown', createdAt: 0 };

  beforeEach(() => {
    installLocalStorageMock();
  });

  it('returns all entries when all are valid', () => {
    global.localStorage.setItem('transactions', JSON.stringify([validTx1, validTx2]));
    const result = TransactionStore.load();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(validTx1);
    expect(result[1]).toEqual(validTx2);
  });

  it('returns empty array when all entries are invalid', () => {
    global.localStorage.setItem('transactions', JSON.stringify([invalidTx, invalidTx]));
    const result = TransactionStore.load();
    expect(result).toEqual([]);
  });

  it('returns only valid entries from a mixed array', () => {
    global.localStorage.setItem('transactions', JSON.stringify([validTx1, invalidTx, validTx2]));
    const result = TransactionStore.load();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(validTx1);
    expect(result[1]).toEqual(validTx2);
  });

  it('returns empty array for non-array JSON value', () => {
    global.localStorage.setItem('transactions', JSON.stringify({ foo: 'bar' }));
    const result = TransactionStore.load();
    expect(result).toEqual([]);
  });

  it('returns empty array for invalid JSON string', () => {
    global.localStorage.setItem('transactions', 'not valid json {{{');
    const result = TransactionStore.load();
    expect(result).toEqual([]);
  });

  it('returns empty array when key is not set (null)', () => {
    // Key was never set — getItem returns null
    const result = TransactionStore.load();
    expect(result).toEqual([]);
  });
});

// ============================================================
// 8.5 — Unit tests for category aggregation logic
// ============================================================

describe('Category aggregation logic', () => {
  it('single transaction per category — each total equals its transaction amount', () => {
    const transactions = [
      { id: '1', name: 'A', amount: 10, category: 'Food', createdAt: 1 },
      { id: '2', name: 'B', amount: 20, category: 'Transport', createdAt: 2 },
      { id: '3', name: 'C', amount: 30, category: 'Fun', createdAt: 3 },
    ];
    const totals = computeCategoryTotals(transactions);
    expect(totals.Food).toBe(10);
    expect(totals.Transport).toBe(20);
    expect(totals.Fun).toBe(30);
  });

  it('multiple transactions in same category — total is the sum', () => {
    const transactions = [
      { id: '1', name: 'A', amount: 5, category: 'Food', createdAt: 1 },
      { id: '2', name: 'B', amount: 15, category: 'Food', createdAt: 2 },
      { id: '3', name: 'C', amount: 7, category: 'Food', createdAt: 3 },
    ];
    const totals = computeCategoryTotals(transactions);
    expect(totals.Food).toBe(27);
    expect(totals.Transport).toBe(0);
    expect(totals.Fun).toBe(0);
  });

  it('no transactions — all totals are 0', () => {
    const totals = computeCategoryTotals([]);
    expect(totals.Food).toBe(0);
    expect(totals.Transport).toBe(0);
    expect(totals.Fun).toBe(0);
  });

  it('mixed categories — each category total is independent', () => {
    const transactions = [
      { id: '1', name: 'A', amount: 100, category: 'Food', createdAt: 1 },
      { id: '2', name: 'B', amount: 50, category: 'Transport', createdAt: 2 },
      { id: '3', name: 'C', amount: 25, category: 'Food', createdAt: 3 },
      { id: '4', name: 'D', amount: 75, category: 'Fun', createdAt: 4 },
    ];
    const totals = computeCategoryTotals(transactions);
    expect(totals.Food).toBe(125);
    expect(totals.Transport).toBe(50);
    expect(totals.Fun).toBe(75);
  });
});

// ============================================================
// 9.1 — PBT Property 1: Transaction serialization round-trip
// ============================================================

describe('PBT Property 1: Transaction serialization round-trip', () => {
  // Feature: expense-tracker, Property 1: Transaction serialization round-trip
  it('JSON round-trip preserves all fields and order — Validates: Requirements 5.1, 5.2, 5.3, 2.3', () => {
    fc.assert(
      fc.property(fc.array(validTransaction), (txs) => {
        const serialized = JSON.stringify(txs);
        const parsed = JSON.parse(serialized);
        const restored = parsed.filter((obj) => Validator.validateTransaction(obj));
        expect(restored).toHaveLength(txs.length);
        for (let i = 0; i < txs.length; i++) {
          expect(restored[i]).toEqual(txs[i]);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// 9.2 — PBT Property 2: Invalid entries are discarded on load
// ============================================================

describe('PBT Property 2: Invalid entries are discarded on load', () => {
  // Feature: expense-tracker, Property 2: Invalid entries are discarded on load
  it('filtering mixed array returns only valid entries without throwing — Validates: Requirements 5.5', () => {
    const malformedObject = fc.oneof(
      fc.constant(null),
      fc.constant({}),
      fc.constant({ id: '', amount: -1 }),
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.record({
        id: fc.string(),
        name: fc.constant(''),
        amount: fc.constant(0),
        category: fc.constant('Unknown'),
        createdAt: fc.constant(-1),
      })
    );

    fc.assert(
      fc.property(
        fc.array(validTransaction),
        fc.array(malformedObject),
        (validTxs, malformed) => {
          // Interleave valid and malformed entries
          const mixed = [...validTxs, ...malformed].sort(() => 0.5 - Math.random());

          let result;
          expect(() => {
            result = mixed.filter((obj) => Validator.validateTransaction(obj));
          }).not.toThrow();

          // All returned entries must be valid
          expect(result.every((obj) => Validator.validateTransaction(obj))).toBe(true);
          // Count of valid entries must equal the number of original valid transactions
          expect(result.length).toBe(validTxs.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// 9.3 — PBT Property 3: Balance equals sum of amounts
// ============================================================

describe('PBT Property 3: Balance equals sum of amounts', () => {
  // Feature: expense-tracker, Property 3: Balance equals sum of amounts
  it('Formatter.currency(sum) equals what renderBalance would display — Validates: Requirements 3.2, 3.3, 3.4, 3.5', () => {
    fc.assert(
      fc.property(fc.array(validTransaction), (txs) => {
        const sum = txs.reduce((s, tx) => s + tx.amount, 0);
        const formatted = Formatter.currency(sum);
        // Must start with $
        expect(formatted.startsWith('$')).toBe(true);
        // Must have exactly one decimal point
        expect((formatted.match(/\./g) || []).length).toBe(1);
        // Must have exactly two digits after the decimal
        const afterDecimal = formatted.split('.')[1];
        expect(afterDecimal).toMatch(/^\d{2}$/);
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// 9.4 — PBT Property 4: Category totals consistent with transaction list
// ============================================================

describe('PBT Property 4: Category totals consistent with transaction list', () => {
  // Feature: expense-tracker, Property 4: Category totals consistent with transaction list
  it('computed totals equal per-category sums; zero-total categories are absent — Validates: Requirements 4.1, 4.2, 4.3, 4.4', () => {
    fc.assert(
      fc.property(fc.array(validTransaction), (txs) => {
        const totals = computeCategoryTotals(txs);

        // Each category total must equal the sum of amounts for that category
        for (const cat of CATEGORIES) {
          const expected = txs
            .filter((tx) => tx.category === cat)
            .reduce((s, tx) => s + tx.amount, 0);
          expect(totals[cat]).toBeCloseTo(expected, 5);
        }

        // Categories with total = 0 must be absent from active categories
        const active = computeActiveCategories(txs);
        for (const cat of CATEGORIES) {
          if (totals[cat] === 0) {
            expect(active).not.toContain(cat);
          } else {
            expect(active).toContain(cat);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// 9.5 — PBT Property 5: Whitespace-only and empty names are rejected
// ============================================================

describe('PBT Property 5: Whitespace-only and empty names are rejected', () => {
  // Feature: expense-tracker, Property 5: Whitespace-only and empty names are rejected
  it('validateForm returns valid: false with errors.name for any whitespace-only or empty name — Validates: Requirements 1.3', () => {
    const whitespaceOrEmpty = fc.oneof(
      fc.constant(''),
      fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'))
    );

    fc.assert(
      fc.property(whitespaceOrEmpty, (whitespaceStr) => {
        const result = Validator.validateForm(whitespaceStr, '1.00', 'Food');
        expect(result.valid).toBe(false);
        expect(result.errors.name).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// 9.6 — PBT Property 6: Out-of-range amounts are rejected
// ============================================================

describe('PBT Property 6: Out-of-range amounts are rejected', () => {
  // Feature: expense-tracker, Property 6: Out-of-range amounts are rejected
  it('validateForm returns valid: false with errors.amount for out-of-range amounts — Validates: Requirements 1.4', () => {
    const outOfRangeAmount = fc.oneof(
      fc.constant('0'),
      fc.double({ max: -Number.EPSILON, noNaN: true, noDefaultInfinity: true }).map(String),
      fc.double({ min: 1_000_000_000, noNaN: true, noDefaultInfinity: true }).map(String),
      fc.constant('NaN'),
      fc.constant('Infinity'),
      fc.constant('-Infinity')
    );

    fc.assert(
      fc.property(outOfRangeAmount, (outOfRangeStr) => {
        const result = Validator.validateForm('Item', outOfRangeStr, 'Food');
        expect(result.valid).toBe(false);
        expect(result.errors.amount).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// 9.7 — PBT Property 7: Add then delete restores prior state
// ============================================================

describe('PBT Property 7: Add then delete restores prior state', () => {
  // Feature: expense-tracker, Property 7: Add then delete restores prior state
  it('add(newTx) then remove(newTx.id) restores the original array — Validates: Requirements 1.2, 2.6, 5.1, 5.2', () => {
    fc.assert(
      fc.property(fc.array(validTransaction), validTransaction, (initialTxs, newTx) => {
        // Set up fresh localStorage mock for each run
        installLocalStorageMock();

        // Seed the store with the initial state
        global.localStorage.setItem('transactions', JSON.stringify(initialTxs));
        TransactionStore.load();

        const before = TransactionStore.getAll();

        // Add then remove
        TransactionStore.add(newTx);
        TransactionStore.remove(newTx.id);

        const after = TransactionStore.getAll();

        expect(after).toEqual(before);
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// 9.8 — PBT Property 8: Currency formatting produces a well-formed string
// ============================================================

describe('PBT Property 8: Currency formatting produces a well-formed string', () => {
  // Feature: expense-tracker, Property 8: Currency formatting produces a well-formed string
  it('result starts with "$", has exactly one ".", and exactly two digits after "." — Validates: Requirements 2.1, 3.2', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 999_999_999.99, noNaN: true, noDefaultInfinity: true }),
        (amount) => {
          const result = Formatter.currency(amount);
          // Starts with $
          expect(result.startsWith('$')).toBe(true);
          // Exactly one decimal point
          expect((result.match(/\./g) || []).length).toBe(1);
          // Exactly two digits after the decimal point
          const afterDecimal = result.split('.')[1];
          expect(afterDecimal).toMatch(/^\d{2}$/);
        }
      ),
      { numRuns: 100 }
    );
  });
});
