/**
 * app.js — Expense & Budget Visualizer
 *
 * Sections:
 *   1. Constants & Custom Errors
 *   2. TransactionStore  (Model — in-memory array + localStorage persistence)
 *   3. Validator         (Pure validation functions, no side effects)
 *   4. Formatter         (Display formatting utilities)
 *   5. Renderer          (View — DOM manipulation and Chart.js rendering)
 *   6. Controller        (Event wiring — connects DOM events to model + renderer)
 */

// ============================================================
// 1. Constants & Custom Errors
// ============================================================

const STORAGE_KEY = "transactions";

const CATEGORIES = ["Food", "Transport", "Fun"];

const CATEGORY_COLORS = {
  Food: "#22c55e",
  Transport: "#3b82f6",
  Fun: "#f97316",
};

class StorageError extends Error {
  constructor(message) {
    super(message);
    this.name = "StorageError";
  }
}

// ============================================================
// 2. TransactionStore (Model)
// ============================================================

let transactions = [];

const TransactionStore = {
  load() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      transactions = [];
      return [];
    }

    if (raw === null) {
      transactions = [];
      return [];
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      transactions = [];
      return [];
    }

    if (!Array.isArray(parsed)) {
      transactions = [];
      return [];
    }

    const valid = parsed.filter((obj) => Validator.validateTransaction(obj));
    transactions = valid;
    return valid;
  },

  getAll() {
    return [...transactions];
  },

  add(tx) {
    const temp = [...transactions, tx];
    TransactionStore._persist(temp);
    transactions = temp;
  },

  remove(id) {
    const filtered = transactions.filter((tx) => tx.id !== id);
    TransactionStore._persist(filtered);
    transactions = filtered;
  },

  _persist(array) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(array));
    } catch (e) {
      throw new StorageError(e.message);
    }
  },
};

// ============================================================
// 3. Validator
// ============================================================

const Validator = {
  /**
   * Validates the three Input_Form fields before a transaction is created.
   *
   * @param {string} name     - Raw value from the item-name text input
   * @param {string} amount   - Raw value from the amount input
   * @param {string} category - Selected value from the category dropdown
   * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
   */
  validateForm(name, amount, category) {
    const errors = {};

    // --- name ---
    const trimmedName = (name ?? "").trim();
    if (trimmedName.length === 0) {
      errors.name = "Item name is required.";
    } else if (trimmedName.length > 100) {
      errors.name = "Item name must be 100 characters or fewer.";
    }

    // --- amount ---
    const parsedAmount = parseFloat(amount);
    if (
      isNaN(parsedAmount) ||
      !isFinite(parsedAmount) ||
      parsedAmount < 0.01 ||
      parsedAmount > 999_999_999.99
    ) {
      errors.amount =
        "Please enter a valid amount between 0.01 and 999,999,999.99.";
    }

    // --- category ---
    if (!CATEGORIES.includes(category)) {
      errors.category = "Please select a valid category.";
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  },

  validateTransaction(obj) {
    // Must be a plain object (not null, not array, not a primitive)
    if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
      return false;
    }

    // id: non-empty string
    if (typeof obj.id !== "string" || obj.id.length === 0) {
      return false;
    }

    // name: non-empty string, trimmed length ≤ 100
    if (
      typeof obj.name !== "string" ||
      obj.name.trim().length === 0 ||
      obj.name.trim().length > 100
    ) {
      return false;
    }

    // amount: finite number in [0.01, 999_999_999.99]
    if (
      typeof obj.amount !== "number" ||
      !isFinite(obj.amount) ||
      obj.amount < 0.01 ||
      obj.amount > 999_999_999.99
    ) {
      return false;
    }

    // category: exactly "Food", "Transport", or "Fun"
    if (!CATEGORIES.includes(obj.category)) {
      return false;
    }

    // createdAt: finite positive number
    if (
      typeof obj.createdAt !== "number" ||
      !isFinite(obj.createdAt) ||
      obj.createdAt <= 0
    ) {
      return false;
    }

    return true;
  },
};

// ============================================================
// 4. Formatter
// ============================================================

const Formatter = {
  /**
   * Formats a number as a USD currency string.
   * Uses Intl.NumberFormat for locale-aware formatting with $ symbol,
   * thousands separators, and exactly 2 decimal places.
   *
   * @param {number} amount - The numeric value to format
   * @returns {string} e.g. "$0.00", "$1,234.50", "$999,999,999.99"
   */
  currency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  },
};

// ============================================================
// 5. Renderer (View)
// ============================================================

// Module-level Chart.js instance — reused across re-renders
let chartInstance = null;

const Renderer = {
  /**
   * Renders the full transaction list into #transaction-list.
   * Clears existing content, then either shows an empty state or
   * builds a <li> for each transaction with info and a delete button.
   *
   * @param {Transaction[]} transactions
   */
  renderTransactionList(transactions) {
    const list = document.getElementById("transaction-list");
    // Clear existing items
    list.innerHTML = "";

    if (transactions.length === 0) {
      Renderer.showEmptyState("transaction-list");
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const tx of transactions) {
      const li = document.createElement("li");

      // Left side: info block
      const infoDiv = document.createElement("div");
      infoDiv.className = "tx-info";

      const nameSpan = document.createElement("span");
      nameSpan.className = "tx-name";
      nameSpan.textContent = tx.name;

      const amountSpan = document.createElement("span");
      amountSpan.className = "tx-amount";
      amountSpan.textContent = Formatter.currency(tx.amount);

      const categorySpan = document.createElement("span");
      categorySpan.className = "tx-category";
      categorySpan.textContent = tx.category;

      infoDiv.appendChild(nameSpan);
      infoDiv.appendChild(amountSpan);
      infoDiv.appendChild(categorySpan);

      // Right side: delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-delete";
      deleteBtn.textContent = "Delete";
      deleteBtn.dataset.id = tx.id;
      deleteBtn.setAttribute("aria-label", `Delete ${tx.name}`);

      li.appendChild(infoDiv);
      li.appendChild(deleteBtn);
      fragment.appendChild(li);
    }

    list.appendChild(fragment);
  },

  /**
   * Computes the total of all transaction amounts and updates #balance-display.
   * Shows "$0.00" for an empty list.
   *
   * @param {Transaction[]} transactions
   */
  renderBalance(transactions) {
    const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const balanceDisplay = document.getElementById("balance-display");
    balanceDisplay.textContent = Formatter.currency(total);
  },

  /**
   * Renders or updates the Chart.js pie chart in #pie-chart.
   * Computes per-category totals, filters out zero-total categories,
   * and either creates a new chart, updates the existing one, or shows
   * an empty state message if there is no data.
   *
   * @param {Transaction[]} transactions
   */
  renderPieChart(transactions) {
    try {
      // Compute totals per category
      const totals = {};
      for (const category of CATEGORIES) {
        totals[category] = 0;
      }
      for (const tx of transactions) {
        if (totals[tx.category] !== undefined) {
          totals[tx.category] += tx.amount;
        }
      }

      // Filter to only categories with a positive total
      const activeCategories = CATEGORIES.filter(
        (cat) => totals[cat] > 0
      );
      const labels = activeCategories;
      const data = activeCategories.map((cat) => totals[cat]);
      const backgroundColors = activeCategories.map(
        (cat) => CATEGORY_COLORS[cat]
      );

      const chartCanvas = document.getElementById("pie-chart");
      const chartEmpty = document.getElementById("chart-empty");

      if (activeCategories.length === 0) {
        // No data — destroy existing chart and show empty state
        if (chartInstance) {
          chartInstance.destroy();
          chartInstance = null;
        }
        chartEmpty.removeAttribute("hidden");
        chartCanvas.setAttribute("hidden", "");
        return;
      }

      if (chartInstance) {
        // Update existing chart in place (avoids "canvas already in use" error)
        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = data;
        chartInstance.data.datasets[0].backgroundColor = backgroundColors;
        chartInstance.update();
      } else {
        // Create a new Chart instance
        chartInstance = new Chart(chartCanvas, {
          type: "pie",
          data: {
            labels,
            datasets: [
              {
                data,
                backgroundColor: backgroundColors,
              },
            ],
          },
          options: {
            plugins: {
              legend: {
                position: "bottom",
              },
            },
          },
        });
      }

      // Show chart, hide empty state
      chartEmpty.setAttribute("hidden", "");
      chartCanvas.removeAttribute("hidden");
    } catch (err) {
      // Gracefully handle Chart.js not being loaded (ReferenceError)
      if (err instanceof ReferenceError) {
        const chartEmpty = document.getElementById("chart-empty");
        chartEmpty.textContent =
          "Chart could not be loaded. Please check your internet connection.";
        chartEmpty.removeAttribute("hidden");
      } else {
        throw err;
      }
    }
  },

  /**
   * Displays inline validation error messages next to each form field.
   * Sets the text content of #error-<key> for each key in the errors object.
   *
   * @param {{ name?: string, amount?: string, category?: string }} errors
   */
  showFormErrors(errors) {
    for (const key of Object.keys(errors)) {
      const errorEl = document.getElementById(`error-${key}`);
      if (errorEl) {
        errorEl.textContent = errors[key];
      }
    }
  },

  /**
   * Clears all inline form validation error messages.
   */
  clearFormErrors() {
    const fields = ["name", "amount", "category"];
    for (const field of fields) {
      const errorEl = document.getElementById(`error-${field}`);
      if (errorEl) {
        errorEl.textContent = "";
      }
    }
  },

  /**
   * Displays a storage error message in the #storage-error banner.
   * Removes the "hidden" attribute so the banner becomes visible.
   *
   * @param {string} message - The error message to display
   */
  showStorageError(message) {
    const errorBanner = document.getElementById("storage-error");
    errorBanner.textContent = message;
    errorBanner.removeAttribute("hidden");
  },

  /**
   * Inserts an empty-state placeholder into the specified container.
   * Uses a <li> for "transaction-list" and a <p> for other containers.
   *
   * @param {string} containerId - The id of the container element
   */
  showEmptyState(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (containerId === "transaction-list") {
      const li = document.createElement("li");
      li.textContent = "No transactions recorded yet.";
      li.style.color = "#6b7280";
      li.style.fontStyle = "italic";
      container.appendChild(li);
    } else {
      const p = document.createElement("p");
      p.textContent = "No spending data available.";
      p.style.color = "#6b7280";
      p.style.fontStyle = "italic";
      container.appendChild(p);
    }
  },
};

// ============================================================
// 6. Controller (Event Wiring)
// ============================================================

const Controller = {
  /**
   * Initializes the application:
   * - Loads persisted transactions from localStorage
   * - Renders the initial UI state (list, balance, chart)
   * - Attaches event listeners for form submission and transaction deletion
   */
  init() {
    const loaded = TransactionStore.load();

    Renderer.renderTransactionList(loaded);
    Renderer.renderBalance(loaded);
    Renderer.renderPieChart(loaded);

    // Form submission listener
    const form = document.getElementById("transaction-form");
    form.addEventListener("submit", Controller.onFormSubmit);

    // Delegated click listener on the transaction list for delete buttons
    const list = document.getElementById("transaction-list");
    list.addEventListener("click", (e) => {
      if (e.target.dataset.id) {
        Controller.onDeleteClick(e);
      }
    });
  },

  /**
   * Handles the Add Transaction form submission.
   * Validates inputs, creates a transaction object, persists it,
   * and re-renders all views. Shows errors on validation or storage failure.
   *
   * @param {Event} e - The form submit event
   */
  onFormSubmit(e) {
    e.preventDefault();

    const name = document.getElementById("input-name").value;
    const amount = document.getElementById("input-amount").value;
    const category = document.getElementById("input-category").value;

    const { valid, errors } = Validator.validateForm(name, amount, category);

    if (!valid) {
      Renderer.showFormErrors(errors);
      return;
    }

    Renderer.clearFormErrors();

    const tx = {
      id: crypto.randomUUID(),
      name: name.trim(),
      amount: parseFloat(amount),
      category,
      createdAt: Date.now(),
    };

    try {
      TransactionStore.add(tx);
    } catch (err) {
      if (err instanceof StorageError) {
        Renderer.showStorageError(err.message);
        return; // Preserve form values — do not reset
      }
      throw err;
    }

    // Reset form and re-render all views
    document.getElementById("transaction-form").reset();

    const all = TransactionStore.getAll();
    Renderer.renderTransactionList(all);
    Renderer.renderBalance(all);
    Renderer.renderPieChart(all);
  },

  /**
   * Handles a click on a delete button within the transaction list.
   * Removes the transaction by id, persists the change, and re-renders all views.
   *
   * @param {Event} e - The click event (delegated from #transaction-list)
   */
  onDeleteClick(e) {
    const id = e.target.dataset.id;
    if (!id) return;

    try {
      TransactionStore.remove(id);
    } catch (err) {
      if (err instanceof StorageError) {
        Renderer.showStorageError(err.message);
        return;
      }
      throw err;
    }

    const all = TransactionStore.getAll();
    Renderer.renderTransactionList(all);
    Renderer.renderBalance(all);
    Renderer.renderPieChart(all);
  },
};

// ============================================================
// Entry Point
// ============================================================

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    Controller.init();
  });
}

// ============================================================
// Exports (for unit testing in Node/Vitest)
// ============================================================

export {
  Validator,
  Formatter,
  TransactionStore,
  Renderer,
  Controller,
  CATEGORIES,
  CATEGORY_COLORS,
  StorageError,
};
