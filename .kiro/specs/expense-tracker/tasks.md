# Implementation Plan: Expense Tracker

## Overview

This plan implements the Expense Tracker single-page web application in ten sequential waves. The work starts with project scaffolding (HTML, CSS, JS skeleton, Vitest config), then builds the core logic modules (TransactionStore, Validator, Formatter), followed by the UI Renderer and Controller event wiring. Persistence edge-cases are verified manually, then unit tests and property-based tests (fast-check, 8 properties) are written and run. The plan closes with cross-browser and accessibility checks.

## Notes

- No build step, no backend, no framework — the app must work via `file://` in Chrome, Firefox, Edge, and Safari.
- Chart.js 4.x is loaded from CDN; all other code is vanilla ES6+.
- All localStorage access must be wrapped in `try/catch`; corrupt data is silently discarded.
- Property-based tests use fast-check with a minimum of 100 runs each.
- WCAG AA contrast ratios (≥ 4.5:1 normal text, ≥ 3:1 large text) must be verified before the spec is considered complete.
- **Folder rules**: `css/` contains exactly one file (`style.css`); `js/` contains exactly one file (`app.js`). No additional CSS or JS files are permitted.
- **Code quality**: consistent indentation, descriptive variable names, section comments separating each module in `app.js`.

## Tasks

- [x] 1. Project Scaffolding
  - [x] 1.1 Create `index.html` with semantic HTML structure
    - Add `<head>` with charset, viewport meta, title "Expense & Budget Visualizer", and Chart.js CDN `<script>` tag (`https://cdn.jsdelivr.net/npm/chart.js`)
    - Add `<link rel="stylesheet" href="css/style.css">` and `<script src="js/app.js" defer>`
    - Add page `<h1>` with text "Expense & Budget Visualizer"
    - Add Balance_Display card: a `<div class="card" id="balance-card">` containing a label "TOTAL BALANCE" and `<div id="balance-display">`
    - Add Input_Form card: `<section class="card">` with heading "Add Transaction", form fields (text input for name maxlength=100, number input for amount, `<select>` for category Food/Transport/Fun), full-width submit button "Add Transaction"
    - Add inline error containers adjacent to each form field (`<span class="error" id="error-name">`, `<span class="error" id="error-amount">`, `<span class="error" id="error-category">`)
    - Add a storage-error banner element (`<div id="storage-error" hidden>`)
    - Add bottom two-column row: `<div class="bottom-row">` containing a Transactions card (`<section class="card" id="transactions-card">`) and a Spending card (`<section class="card" id="chart-card">`)
    - Inside Transactions card: heading "Transactions" and `<ul id="transaction-list">`
    - Inside Spending card: heading "Spending by Category", `<canvas id="pie-chart">`, and an empty-state fallback `<p id="chart-empty" hidden>`
    - All interactive elements must have associated `<label>` elements for accessibility
    - **Acceptance criteria**: File opens in a browser via `file://` with no console errors; all structural elements are present in the DOM; layout matches the two-column bottom section from the target design
  - [x] 1.2 Create `css/style.css` with base layout and component styles
    - CSS reset / box-sizing
    - Page background: light grey (`#f0f2f5`); centered container, max-width ~800 px
    - Page title (`h1`): centered, dark text
    - `.card`: white background, `border-radius: 8px`, `box-shadow: 0 1px 4px rgba(0,0,0,0.1)`, padding `1.5rem`, `margin-bottom: 1rem`
    - Balance_Display card: "TOTAL BALANCE" label in small uppercase grey text; balance amount in large (~2.5rem) bold blue text (`#3b82f6`)
    - Input_Form: stacked fields with labels above inputs, visible focus rings, full-width inputs, error message styling (small red text below field)
    - Submit button: full-width, blue background (`#3b82f6`), white text, `border-radius: 6px`, hover darkens slightly
    - `.bottom-row`: CSS Grid or Flexbox, two equal-width columns side by side; stacks to single column on narrow viewports (≤ 600 px)
    - Transaction list items: item name in bold dark text, amount in blue (`#3b82f6`), category as a small grey pill badge (`background: #e5e7eb`, `border-radius: 4px`, small padding); delete button red (`#ef4444`), white text, right-aligned
    - Transaction_List: scrollable (`max-height: 300px` + `overflow-y: auto`)
    - Pie_Chart section: canvas wrapper with fixed height (~250 px)
    - Storage-error banner: high-contrast warning style (red/orange background, white text)
    - Pie chart category colors: Food = `#22c55e`, Transport = `#3b82f6`, Fun = `#f97316`
    - WCAG AA contrast ratios for all text/background pairs (≥ 4.5:1 normal text, ≥ 3:1 large text)
    - **Acceptance criteria**: Layout matches the target design screenshot; no horizontal scroll on 375 px viewport; two-column bottom section visible on desktop; contrast ratios pass browser accessibility audit
  - [x] 1.3 Create `js/app.js` skeleton with module-level constants and empty component stubs
    - Add a top-of-file comment block identifying the module sections
    - Define `STORAGE_KEY = "transactions"` constant
    - Define `CATEGORIES = ["Food", "Transport", "Fun"]` constant
    - Define `CATEGORY_COLORS = { Food: "#22c55e", Transport: "#3b82f6", Fun: "#f97316" }` constant
    - Define `StorageError` custom Error subclass
    - Add clearly separated section comments: `// === TransactionStore ===`, `// === Validator ===`, `// === Formatter ===`, `// === Renderer ===`, `// === Controller ===`
    - Declare empty stubs for `TransactionStore`, `Validator`, `Formatter`, `Renderer`, `Controller`
    - Add `DOMContentLoaded` listener that calls `Controller.init()`
    - **Acceptance criteria**: `js/app.js` loads without syntax errors; `Controller.init()` is called on page load; section comments make the file easy to navigate
  - [x] 1.4 Create `vitest.config.js`
    - Set `test.environment` to `"node"` (pure logic; DOM tests use `"jsdom"`)
    - Set `test.include` to `["**/*.test.js"]`
    - **Acceptance criteria**: Running `npx vitest run` exits without configuration errors (even with no test files yet)

- [x] 2. TransactionStore (Model)
  - [x] 2.1 Implement `TransactionStore.load()`
    - Read raw string from `localStorage.getItem(STORAGE_KEY)` inside a `try/catch`
    - On read exception: return `[]`
    - If value is `null` or not parseable as JSON: return `[]`
    - If parsed value is not an array: return `[]`
    - Filter each element through `Validator.validateTransaction(obj)`; keep only valid entries
    - Assign the filtered array to the module-level `transactions` variable
    - Return the filtered array
    - **Acceptance criteria**: Requirement 5.3, 5.4, 5.5 — corrupt data never throws; only valid entries are returned
  - [x] 2.2 Implement `TransactionStore.getAll()`
    - Return a shallow copy of the in-memory `transactions` array (prevents external mutation)
    - **Acceptance criteria**: Returned array is equal in content but not the same reference
  - [x] 2.3 Implement `TransactionStore.add(tx)`
    - Append `tx` to a temporary copy of the in-memory array
    - Call `TransactionStore._persist(tempArray)`; if it throws `StorageError`, re-throw without mutating `transactions`
    - On success, assign `tempArray` to `transactions`
    - **Acceptance criteria**: Requirement 1.2, 5.1 — transaction is added and persisted; on storage failure the in-memory array is unchanged
  - [x] 2.4 Implement `TransactionStore.remove(id)`
    - Filter the in-memory array to exclude the entry with matching `id`
    - Call `TransactionStore._persist(filtered)`; if it throws `StorageError`, re-throw without mutating `transactions`
    - On success, assign `filtered` to `transactions`
    - **Acceptance criteria**: Requirement 2.6, 5.2 — transaction is removed and persisted; on storage failure the in-memory array is unchanged
  - [x] 2.5 Implement `TransactionStore._persist(array)`
    - Call `localStorage.setItem(STORAGE_KEY, JSON.stringify(array))` inside a `try/catch`
    - On exception, throw `new StorageError(originalError.message)`
    - **Acceptance criteria**: Requirement 5.1, 5.2 — data is written as a JSON string; quota/security errors are wrapped and re-thrown

- [ ] 3. Validator
  - [x] 3.1 Implement `Validator.validateForm(name, amount, category)`
    - `name`: trim the value; error if trimmed length is 0 or > 100
    - `amount`: parse with `parseFloat`; error if `NaN`, not finite, `< 0.01`, or `> 999_999_999.99`
    - `category`: error if not exactly one of `"Food"`, `"Transport"`, `"Fun"`
    - Return `{ valid: boolean, errors: { name?, amount?, category? } }`
    - **Acceptance criteria**: Requirement 1.3, 1.4 — all invalid combinations produce `valid: false` with the correct error key(s)
  - [-] 3.2 Implement `Validator.validateTransaction(obj)`
    - Return `false` if `obj` is not a plain object
    - Check `id`: non-empty string
    - Check `name`: non-empty string, trimmed length ≤ 100
    - Check `amount`: finite number in `[0.01, 999_999_999.99]`
    - Check `category`: exactly `"Food"`, `"Transport"`, or `"Fun"`
    - Check `createdAt`: finite positive number
    - Return `true` only if all checks pass
    - **Acceptance criteria**: Requirement 5.5 — malformed localStorage entries are correctly identified and will be discarded

- [x] 4. Formatter
  - [x] 4.1 Implement `Formatter.currency(amount)`
    - Use `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)`
    - **Acceptance criteria**: Requirement 2.1, 3.2 — `0` → `"$0.00"`, `1234.5` → `"$1,234.50"`, `999999999.99` → `"$999,999,999.99"`

- [x] 5. UI Renderer (View)
  - [x] 5.1 Implement `Renderer.renderTransactionList(transactions)`
    - Clear the `#transaction-list` element
    - If `transactions` is empty, call `Renderer.showEmptyState("transaction-list")` and return
    - For each transaction, create a `<li>` with:
      - Item name in bold dark text
      - Amount in blue text using `Formatter.currency(amount)`
      - Category as a small grey pill badge (`<span class="badge">`)
      - A red delete `<button class="btn-delete">` with `data-id` set to `tx.id` and `aria-label="Delete <name>"`
    - Append all `<li>` elements to `#transaction-list`
    - **Acceptance criteria**: Requirement 2.1, 2.2, 2.4, 2.5, 2.7 — list renders with correct visual style matching the target design; empty state shown when no transactions
  - [x] 5.2 Implement `Renderer.renderBalance(transactions)`
    - Sum all `tx.amount` values
    - Set `#balance-display` text content to `Formatter.currency(total)`
    - **Acceptance criteria**: Requirement 3.1, 3.2, 3.3, 3.4, 3.5 — balance is always the formatted sum; shows `$0.00` for empty list
  - [x] 5.3 Implement `Renderer.renderPieChart(transactions)`
    - Compute `CategoryTotals` by summing amounts per category
    - Filter to only categories with `total > 0`
    - Use `CATEGORY_COLORS` for segment colors: Food = `#22c55e`, Transport = `#3b82f6`, Fun = `#f97316`
    - If no categories have data: destroy existing chart instance (if any), show `#chart-empty` message, return
    - If a chart instance already exists: update `data.labels`, `data.datasets[0].data`, `data.datasets[0].backgroundColor` in place, then call `chart.update()`
    - If no chart instance exists: create a new `Chart` instance on `#pie-chart` canvas with type `"pie"` and a legend at the bottom
    - Wrap the entire function in `try/catch`; on `ReferenceError` (Chart.js not loaded), display a fallback message
    - **Acceptance criteria**: Requirement 4.1, 4.2, 4.3, 4.4, 4.5, 7.4 — chart renders with correct colors matching the target design; updates without "canvas already in use" error; empty state shown when no data; CDN failure does not crash the app
  - [x] 5.4 Implement `Renderer.showFormErrors(errors)` and `Renderer.clearFormErrors()`
    - `showFormErrors`: for each key in `errors`, set the text content of the corresponding `#error-<field>` element
    - `clearFormErrors`: clear all `#error-*` elements
    - **Acceptance criteria**: Requirement 1.3, 1.4 — error messages appear adjacent to the correct fields; cleared on next successful submit
  - [x] 5.5 Implement `Renderer.showStorageError(message)` and `Renderer.showEmptyState(containerId)`
    - `showStorageError`: set text content of `#storage-error` and remove the `hidden` attribute
    - `showEmptyState`: insert a `<p>` or `<li>` with an appropriate "no data" message into the target container
    - **Acceptance criteria**: Requirement 1.6, 2.7, 4.5 — storage error banner is visible; empty-state messages appear in the correct containers

- [x] 6. Controller (Event Wiring)
  - [x] 6.1 Implement `Controller.init()`
    - Call `TransactionStore.load()` to populate in-memory state
    - Call `Renderer.renderTransactionList`, `Renderer.renderBalance`, and `Renderer.renderPieChart` with the loaded transactions
    - Attach `submit` listener on the Input_Form (calls `Controller.onFormSubmit`)
    - Attach delegated `click` listener on `#transaction-list` (calls `Controller.onDeleteClick` when `event.target` has `data-id`)
    - **Acceptance criteria**: Requirement 2.3, 5.3 — page load restores and renders all persisted transactions
  - [x] 6.2 Implement `Controller.onFormSubmit(e)`
    - Call `e.preventDefault()`
    - Read name, amount, and category from form fields
    - Call `Validator.validateForm(name, amount, category)`
    - If invalid: call `Renderer.showFormErrors(errors)` and return
    - Call `Renderer.clearFormErrors()`
    - Build transaction object: `{ id: crypto.randomUUID(), name: name.trim(), amount: parseFloat(amount), category, createdAt: Date.now() }`
    - Call `TransactionStore.add(tx)` inside a `try/catch`
    - On `StorageError`: call `Renderer.showStorageError(err.message)` and return (form values preserved)
    - On success: reset the form, re-render all three views
    - **Acceptance criteria**: Requirement 1.2, 1.3, 1.4, 1.5, 1.6, 2.4, 3.3, 4.2, 7.1 — full add flow works end-to-end within 300 ms
  - [x] 6.3 Implement `Controller.onDeleteClick(e)`
    - Check `e.target.dataset.id`; if absent, return
    - Call `TransactionStore.remove(id)` inside a `try/catch`
    - On `StorageError`: call `Renderer.showStorageError(err.message)` and return
    - On success: re-render all three views
    - **Acceptance criteria**: Requirement 2.6, 3.4, 4.3, 7.1 — full delete flow works end-to-end within 300 ms

- [x] 7. localStorage Persistence and Error Handling
  - [x] 7.1 Verify end-to-end persistence across page reload
    - Add a transaction, reload the page, confirm the transaction appears in the list, balance, and chart
    - **Acceptance criteria**: Requirement 5.3 — data survives a full page reload
  - [x] 7.2 Verify storage failure path
    - Simulate `localStorage.setItem` throwing (e.g., mock in tests or use DevTools quota override)
    - Confirm the storage-error banner appears, the form values are preserved, and the in-memory array is unchanged
    - **Acceptance criteria**: Requirement 1.6, 5.4 — no unhandled errors; user input is not lost
  - [x] 7.3 Verify corrupt data recovery on load
    - Manually set `localStorage["transactions"]` to invalid JSON, a non-array, and a mixed-validity array
    - Reload the page and confirm the app starts cleanly with only valid entries (or empty list)
    - **Acceptance criteria**: Requirement 5.5 — no unhandled errors; only valid entries are restored

- [x] 8. Unit Tests
  - [x] 8.1 Write unit tests for `Validator.validateForm`
    - Valid inputs: typical name, valid amount, valid category → `valid: true`
    - Empty name → `valid: false`, `errors.name` set
    - Whitespace-only name → `valid: false`, `errors.name` set
    - Name exceeding 100 characters → `valid: false`, `errors.name` set
    - Amount = 0 → `valid: false`, `errors.amount` set
    - Amount = -1 → `valid: false`, `errors.amount` set
    - Amount = 1_000_000_000 → `valid: false`, `errors.amount` set
    - Amount = "abc" → `valid: false`, `errors.amount` set
    - Invalid category string → `valid: false`, `errors.category` set
    - All three fields invalid simultaneously → all three error keys present
    - **Acceptance criteria**: All assertions pass; covers Requirement 1.3, 1.4
  - [x] 8.2 Write unit tests for `Validator.validateTransaction`
    - Valid transaction object → `true`
    - Missing `id` field → `false`
    - `amount` = 0 → `false`
    - `amount` = negative → `false`
    - `category` = `"Other"` → `false`
    - `createdAt` = 0 → `false`
    - Non-object input (string, null, array) → `false`
    - **Acceptance criteria**: All assertions pass; covers Requirement 5.5
  - [x] 8.3 Write unit tests for `Formatter.currency`
    - `0` → `"$0.00"`
    - `1234.5` → `"$1,234.50"`
    - `999999999.99` → `"$999,999,999.99"`
    - `0.01` → `"$0.01"`
    - `1000000` → `"$1,000,000.00"`
    - **Acceptance criteria**: All assertions pass; covers Requirement 2.1, 3.2
  - [x] 8.4 Write unit tests for `TransactionStore` deserialization (via `load()`)
    - All-valid array → all entries returned
    - All-invalid array → empty array returned
    - Mixed array → only valid entries returned
    - Non-array JSON value → empty array returned
    - Invalid JSON string → empty array returned
    - `null` (key not set) → empty array returned
    - **Acceptance criteria**: All assertions pass; covers Requirement 5.3, 5.5
  - [x] 8.5 Write unit tests for category aggregation logic
    - Single transaction per category → each category total equals its transaction amount
    - Multiple transactions in same category → total is the sum
    - No transactions → all totals are 0 (or categories are absent)
    - Mixed categories → each category total is independent
    - **Acceptance criteria**: All assertions pass; covers Requirement 4.1, 4.2, 4.3, 4.4

- [x] 9. Property-Based Tests (fast-check)
  - [x] 9.1 Write PBT for Property 1: Transaction serialization round-trip
    - Tag: `// Feature: expense-tracker, Property 1: Transaction serialization round-trip`
    - Generator: arbitrary array of valid `Transaction` objects (use `fc.record` with constrained fields)
    - Property: `JSON.parse(JSON.stringify(txs))` filtered through `validateTransaction` deeply equals the original array
    - Minimum 100 runs
    - **Validates: Requirements 5.1, 5.2, 5.3, 2.3**
  - [x] 9.2 Write PBT for Property 2: Invalid entries are discarded on load
    - Tag: `// Feature: expense-tracker, Property 2: Invalid entries are discarded on load`
    - Generator: mixed array of valid transactions and arbitrary malformed objects
    - Property: parsing and validating the mixed array returns only the valid entries; no error is thrown
    - Minimum 100 runs
    - **Validates: Requirements 5.5**
  - [x] 9.3 Write PBT for Property 3: Balance equals sum of amounts
    - Tag: `// Feature: expense-tracker, Property 3: Balance equals sum of amounts`
    - Generator: arbitrary array of valid transactions (including empty array)
    - Property: `Formatter.currency(sum of amounts)` equals the value that `renderBalance` would display
    - Minimum 100 runs
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
  - [x] 9.4 Write PBT for Property 4: Category totals are consistent with the transaction list
    - Tag: `// Feature: expense-tracker, Property 4: Category totals consistent with transaction list`
    - Generator: arbitrary array of valid transactions
    - Property: computed category totals equal per-category sums; categories with total = 0 are absent from chart data
    - Minimum 100 runs
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
  - [x] 9.5 Write PBT for Property 5: Whitespace-only and empty names are rejected
    - Tag: `// Feature: expense-tracker, Property 5: Whitespace-only and empty names are rejected`
    - Generator: `fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'))` (including empty string)
    - Property: `Validator.validateForm(whitespaceStr, "1.00", "Food")` returns `valid: false` with `errors.name` defined
    - Minimum 100 runs
    - **Validates: Requirements 1.3**
  - [x] 9.6 Write PBT for Property 6: Out-of-range amounts are rejected
    - Tag: `// Feature: expense-tracker, Property 6: Out-of-range amounts are rejected`
    - Generator: union of `fc.constant(0)`, `fc.double({ max: -Number.EPSILON })`, `fc.double({ min: 1_000_000_000 })`, `fc.constant(NaN)`, `fc.constant(Infinity)`, `fc.constant(-Infinity)`
    - Property: `Validator.validateForm("Item", String(outOfRange), "Food")` returns `valid: false` with `errors.amount` defined
    - Minimum 100 runs
    - **Validates: Requirements 1.4**
  - [x] 9.7 Write PBT for Property 7: Add then delete restores prior state
    - Tag: `// Feature: expense-tracker, Property 7: Add then delete restores prior state`
    - Generator: arbitrary initial `Transaction[]` + one new valid transaction object
    - Property: after `add(newTx)` then `remove(newTx.id)`, `getAll()` deeply equals the original array
    - Minimum 100 runs
    - **Validates: Requirements 1.2, 2.6, 5.1, 5.2**
  - [x] 9.8 Write PBT for Property 8: Currency formatting produces a well-formed string
    - Tag: `// Feature: expense-tracker, Property 8: Currency formatting produces a well-formed string`
    - Generator: `fc.double({ min: 0, max: 999_999_999.99, noNaN: true, noDefaultInfinity: true })`
    - Property: result starts with `"$"`, contains exactly one `"."`, and has exactly two digits after the `"."`
    - Minimum 100 runs
    - **Validates: Requirements 2.1, 3.2**

- [x] 10. Cross-Browser and Accessibility Checks
  - [x] 10.1 Verify app loads and functions via `file://` protocol in Chrome, Firefox, Edge, and Safari
    - Open `index.html` directly from the filesystem in each browser
    - Add a transaction, delete a transaction, reload the page
    - Confirm no console errors and all UI components update correctly
    - **Acceptance criteria**: Requirement 6.1, 6.2, 7.2 — app is fully functional in all four browsers without a server
  - [x] 10.2 Run browser accessibility audit (DevTools Lighthouse / axe)
    - Verify all form inputs have associated labels
    - Verify contrast ratios ≥ 4.5:1 for normal text and ≥ 3:1 for large text
    - Verify delete buttons have accessible names
    - Verify focus order is logical and all interactive elements are keyboard-reachable
    - **Acceptance criteria**: Requirement 7.3 — WCAG AA contrast and labeling requirements are met
  - [x] 10.3 Verify performance: UI updates within 100 ms
    - Use browser DevTools Performance panel to measure time from form submit / delete click to DOM update
    - **Acceptance criteria**: Requirement 7.1 — all three UI components update within 100 ms on target hardware

---

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1.1", "1.2", "1.3", "1.4"],
      "description": "Project scaffolding — index.html, css/style.css, js/app.js skeleton, vitest.config.js; all four files can be created in parallel"
    },
    {
      "wave": 2,
      "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5"],
      "description": "TransactionStore (Model) — depends on app.js skeleton (1.3)"
    },
    {
      "wave": 3,
      "tasks": ["3.1", "3.2", "4.1"],
      "description": "Validator and Formatter — can be implemented in parallel; depend on app.js skeleton (1.3)"
    },
    {
      "wave": 4,
      "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5"],
      "description": "UI Renderer — depends on Validator (3.x), Formatter (4.1), and TransactionStore (2.x)"
    },
    {
      "wave": 5,
      "tasks": ["6.1", "6.2", "6.3"],
      "description": "Controller / event wiring — depends on all Renderer functions (5.x) and TransactionStore (2.x)"
    },
    {
      "wave": 6,
      "tasks": ["7.1", "7.2", "7.3"],
      "description": "Persistence and error-handling verification — depends on full Controller (6.x)"
    },
    {
      "wave": 7,
      "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "9.1", "9.2", "9.3", "9.4", "9.5", "9.6", "9.7", "9.8"],
      "description": "Unit tests and property-based tests — can be written in parallel once logic modules are complete (waves 2–3)"
    },
    {
      "wave": 8,
      "tasks": ["10.1", "10.2", "10.3"],
      "description": "Cross-browser and accessibility checks — depends on complete Controller (6.x) and passing tests (waves 7)"
    }
  ]
}
```
