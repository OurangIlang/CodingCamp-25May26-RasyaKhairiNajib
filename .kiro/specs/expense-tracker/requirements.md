# Requirements Document

## Introduction

A personal expense tracker web application built with HTML, CSS, and Vanilla JavaScript. The app allows users to log expenses by name, amount, and category; view a scrollable transaction list; see a running total balance; and visualize spending by category via a pie chart. All data is persisted in the browser's localStorage with no backend required.

## Glossary

- **App**: The expense tracker single-page web application.
- **Transaction**: A single expense entry consisting of an item name, amount, and category.
- **Transaction_List**: The scrollable UI component that displays all recorded transactions.
- **Input_Form**: The HTML form used to capture a new transaction's item name, amount, and category.
- **Balance_Display**: The UI element at the top of the page that shows the total sum of all transaction amounts.
- **Category**: One of three fixed expense classifications: Food, Transport, or Fun.
- **Pie_Chart**: A Chart.js-rendered chart that visualizes the proportion of total spending per category.
- **Storage**: The browser's localStorage API used for client-side data persistence.
- **Validator**: The client-side logic that checks Input_Form fields before submission.

---

## Requirements

### Requirement 1: Transaction Input Form

**User Story:** As a user, I want to fill in an expense form with item name, amount, and category, so that I can record a new transaction quickly.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for item name (max 100 characters), a numeric field for amount (range 0.01–999,999,999.99), and a dropdown selector with options Food, Transport, and Fun.
2. WHEN the user submits the Input_Form with all fields filled and an amount in the range 0.01–999,999,999.99, THE App SHALL add the transaction to the Transaction_List and persist it to Storage.
3. IF the user submits the Input_Form with any field empty, THEN THE Validator SHALL display an inline error message indicating which field is missing and SHALL NOT add a transaction.
4. IF the user submits the Input_Form with an amount that is zero, negative, non-numeric, or exceeds 999,999,999.99, THEN THE Validator SHALL display an inline error message and SHALL NOT add a transaction.
5. WHEN a transaction is successfully added, THE Input_Form SHALL reset the item name field to empty, the amount field to empty, and the category dropdown to "Food".
6. IF writing to Storage fails during transaction submission, THEN THE App SHALL display an error message and SHALL preserve the current form field values so the user does not lose their input.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see all my recorded expenses in a scrollable list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each transaction's item name, amount formatted as a currency string (currency symbol, thousands separator, exactly 2 decimal places, e.g. $1,234.56), and category.
2. WHEN the Transaction_List contains more items than the visible area, THE Transaction_List SHALL be scrollable without affecting the rest of the page layout.
3. WHEN the App loads, THE Transaction_List SHALL render all transactions previously persisted in Storage in the order they were originally saved.
4. WHEN a new transaction is added, THE Transaction_List SHALL update to include the new entry within 300 milliseconds of the submission action, without requiring a page reload.
5. THE Transaction_List SHALL display a delete button for each transaction entry.
6. WHEN the user clicks the delete button for a transaction, THE App SHALL remove that transaction from the Transaction_List, update Storage, and update the Balance_Display and Pie_Chart within 300 milliseconds.
7. WHEN no transactions exist, THE Transaction_List SHALL display a message indicating that no transactions have been recorded.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total spending at the top of the page, so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE Balance_Display SHALL be positioned at the top of the page.
2. THE Balance_Display SHALL show the sum of all transaction amounts formatted as a currency string (currency symbol, thousands separator, exactly 2 decimal places, e.g. $1,234.56 or $0.00).
3. WHEN a transaction is added, THE Balance_Display SHALL update to reflect the new total.
4. WHEN a transaction is deleted, THE Balance_Display SHALL update to reflect the reduced total.
5. WHEN no transactions exist, THE Balance_Display SHALL show $0.00.

---

### Requirement 4: Category Spending Pie Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Pie_Chart SHALL render a pie chart with one segment per category (Food, Transport, Fun) representing the sum of transaction amounts in that category.
2. WHEN a transaction is added, THE Pie_Chart SHALL update to reflect the new category totals without requiring a page reload.
3. WHEN a transaction is deleted, THE Pie_Chart SHALL update to reflect the revised category totals without requiring a page reload.
4. WHEN a category has no transactions, THE Pie_Chart SHALL omit that category's segment from the rendered chart.
5. WHEN all transactions are deleted, THE Pie_Chart SHALL display a visible message or label indicating that no spending data is available.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to be saved between browser sessions, so that I do not lose my expense history when I close or refresh the page.

#### Acceptance Criteria

1. WHEN a transaction is added, THE App SHALL serialize the updated transaction list and write it to Storage under the key `"transactions"`.
2. WHEN a transaction is deleted, THE App SHALL serialize the updated transaction list and write it to Storage under the key `"transactions"`.
3. WHEN the App loads, THE App SHALL read the transaction list from Storage under the key `"transactions"` and restore all previously saved transactions in their original saved order.
4. IF accessing Storage throws an exception, THEN THE App SHALL initialize with an empty transaction list and SHALL NOT throw an unhandled error.
5. IF the data read from Storage under `"transactions"` cannot be parsed as a valid transaction array, THEN THE App SHALL initialize with an empty transaction list and SHALL NOT throw an unhandled error. IF the data is an array where some entries individually conform to the valid transaction structure and others do not, THEN THE App SHALL restore only the conforming entries and discard the rest.

---

### Requirement 6: Cross-Browser Compatibility

**User Story:** As a user, I want the app to work correctly in Chrome, Firefox, Edge, and Safari, so that I can use it regardless of my preferred browser.

#### Acceptance Criteria

1. THE App SHALL render without broken layout, missing UI elements, or uncaught JavaScript errors, and all controls SHALL be operable in the latest stable versions of Chrome, Firefox, Edge, and Safari.
2. THE App SHALL use only standard HTML5, CSS3, and ES6+ JavaScript features that are supported across Chrome, Firefox, Edge, and Safari without vendor-specific prefixes where standard properties exist.
3. THE App SHALL load and become interactive (all user controls operable with no blocking JavaScript errors) within 3 seconds on a connection with at least 10 Mbps download speed in all four supported browsers.

---

### Requirement 7: Performance and UI Quality

**User Story:** As a user, I want the app to feel fast and look clean, so that using it is pleasant and efficient.

#### Acceptance Criteria

1. WHEN the user confirms an add or delete action, THE App SHALL update all UI components (Transaction_List, Balance_Display, Pie_Chart) to display the updated data within 100 milliseconds, measured on a device with at least a dual-core 2 GHz CPU, 4 GB RAM, and a current-version Chromium-based browser.
2. WHEN the App is opened via the file:// protocol in a current-version Chromium-based browser, THE App SHALL load and become fully functional without requiring a build step or a running server.
3. THE App SHALL render all text elements with a contrast ratio of at least 4.5:1 against their background for normal-sized text and at least 3:1 for large text, in accordance with WCAG AA requirements.
4. WHEN the user interacts with the App (including adding transactions, deleting transactions, and loading the page), THE App SHALL not produce unhandled JavaScript errors in the browser console.
