import React, { useEffect, useMemo, useState } from "react";
import {
  WalletCards,
  Plus,
  Edit3,
  Trash2,
  X,
  Save,
  TrendingDown,
  TrendingUp,
  CalendarDays,
  IndianRupee,
  FileText,
} from "lucide-react";

const STORAGE_KEY = "taskbar-expenses";
const INCOME_KEY = "taskbar-income";
const FINANCE_EVENT = "taskbar-finance-updated";

const emptyForm = {
  name: "",
  amount: "",
  date: new Date().toISOString().split("T")[0],
  category: "Food",
  notes: "",
};

const categories = [
  "Food",
  "Travel",
  "Shopping",
  "Education",
  "Bills",
  "Health",
  "Entertainment",
  "Other",
  "Investment",
];

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date) {
  if (!date) return "-";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStoredList(key) {
  try {
    const saved = localStorage.getItem(key);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Failed to load ${key}:`, error);
    return [];
  }
}

export default function Expenses() {
  const [expenseList, setExpenseList] = useState([]);
  const [incomeList, setIncomeList] = useState([]);

  const [form, setForm] = useState(emptyForm);

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState(null);

  /* =========================================================
     LOAD FINANCE DATA
     ========================================================= */

  function loadFinanceData() {
    setExpenseList(getStoredList(STORAGE_KEY));
    setIncomeList(getStoredList(INCOME_KEY));
  }

  /* =========================================================
     SYNC INCOME + EXPENSES
     ========================================================= */

  useEffect(() => {
    loadFinanceData();

    const handleFinanceUpdate = () => {
      loadFinanceData();
    };

    const handleStorageUpdate = (event) => {
      if (
        event.key === STORAGE_KEY ||
        event.key === INCOME_KEY
      ) {
        loadFinanceData();
      }
    };

    window.addEventListener(
      FINANCE_EVENT,
      handleFinanceUpdate
    );

    window.addEventListener(
      "storage",
      handleStorageUpdate
    );

    return () => {
      window.removeEventListener(
        FINANCE_EVENT,
        handleFinanceUpdate
      );

      window.removeEventListener(
        "storage",
        handleStorageUpdate
      );
    };
  }, []);

  /* =========================================================
     SAVE EXPENSES
     ========================================================= */

  function persistExpenses(nextList) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(nextList)
      );

      setExpenseList(nextList);

      window.dispatchEvent(
        new Event(FINANCE_EVENT)
      );
    } catch (error) {
      console.error(
        "Failed to save expenses:",
        error
      );
    }
  }

  /* =========================================================
     TOTAL EXPENSES
     ========================================================= */

  const totalExpenses = useMemo(() => {
    return expenseList.reduce(
      (total, item) =>
        total + Number(item.amount || 0),
      0
    );
  }, [expenseList]);

  /* =========================================================
     CURRENT MONTH EXPENSES
     ========================================================= */

  const currentMonthExpenses = useMemo(() => {
    const now = new Date();

    return expenseList
      .filter((item) => {
        if (!item.date) return false;

        const date = new Date(
          `${item.date}T00:00:00`
        );

        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      })
      .reduce(
        (total, item) =>
          total + Number(item.amount || 0),
        0
      );
  }, [expenseList]);

  /* =========================================================
     CURRENT MONTH INCOME
     ========================================================= */

  const currentMonthIncome = useMemo(() => {
    const now = new Date();

    return incomeList
      .filter((item) => {
        if (!item.date) return false;

        const date = new Date(
          `${item.date}T00:00:00`
        );

        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      })
      .reduce(
        (total, item) =>
          total + Number(item.amount || 0),
        0
      );
  }, [incomeList]);

  /* =========================================================
     CURRENT MONTH BALANCE
     ========================================================= */

  const currentMonthBalance =
    currentMonthIncome -
    currentMonthExpenses;

  /* =========================================================
     SPENDING PERCENTAGE
     ========================================================= */

  const spendingPercentage =
    currentMonthIncome > 0
      ? Math.min(
          (currentMonthExpenses /
            currentMonthIncome) *
            100,
          100
        )
      : 0;

  /* =========================================================
     EXPENSE COUNT
     ========================================================= */

  const expenseCount = expenseList.length;

  /* =========================================================
     SORT EXPENSES
     ========================================================= */

  const sortedExpenses = useMemo(() => {
    return [...expenseList].sort((a, b) => {
      return (
        new Date(`${b.date}T00:00:00`) -
        new Date(`${a.date}T00:00:00`)
      );
    });
  }, [expenseList]);

  /* =========================================================
     ADD FORM
     ========================================================= */

  function openAddForm() {
    setEditingId(null);

    setForm({
      ...emptyForm,
      date: new Date()
        .toISOString()
        .split("T")[0],
    });

    setShowForm(true);
  }

  /* =========================================================
     EDIT FORM
     ========================================================= */

  function openEditForm(item) {
    setEditingId(item.id);

    setForm({
      name: item.name || "",
      amount: item.amount || "",
      date:
        item.date ||
        new Date()
          .toISOString()
          .split("T")[0],
      category: item.category || "Food",
      notes: item.notes || "",
    });

    setShowForm(true);
  }

  /* =========================================================
     CLOSE FORM
     ========================================================= */

  function closeForm() {
    setShowForm(false);

    setEditingId(null);

    setForm({
      ...emptyForm,
      date: new Date()
        .toISOString()
        .split("T")[0],
    });
  }

  /* =========================================================
     FORM CHANGE
     ========================================================= */

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  /* =========================================================
     SUBMIT EXPENSE
     ========================================================= */

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Please enter expense name.");
      return;
    }

    if (
      !form.amount ||
      Number(form.amount) <= 0
    ) {
      alert("Please enter a valid amount.");
      return;
    }

    if (!form.date) {
      alert("Please select a date.");
      return;
    }

    /* UPDATE */

    if (editingId) {
      const nextList = expenseList.map(
        (item) =>
          item.id === editingId
            ? {
                ...item,
                name: form.name.trim(),
                amount: Number(form.amount),
                date: form.date,
                category: form.category,
                notes: form.notes.trim(),
                updatedAt:
                  new Date().toISOString(),
              }
            : item
      );

      persistExpenses(nextList);
    }

    /* ADD */

    else {
      const newExpense = {
        id: `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,

        name: form.name.trim(),

        amount: Number(form.amount),

        date: form.date,

        category: form.category,

        notes: form.notes.trim(),

        createdAt:
          new Date().toISOString(),
      };

      persistExpenses([
        newExpense,
        ...expenseList,
      ]);
    }

    closeForm();
  }

  /* =========================================================
     DELETE EXPENSE
     ========================================================= */

  function deleteExpense(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this expense?"
    );

    if (!confirmed) return;

    const nextList = expenseList.filter(
      (item) => item.id !== id
    );

    persistExpenses(nextList);
  }

  return (
    <div className="finance-page page-container">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="page-header">

        <div className="page-header-left">

          <div className="page-header-icon">
            <WalletCards size={23} />
          </div>

          <div>

            <h1 className="page-title">
              Expenses
            </h1>

            <p className="page-subtitle">
              Track your spending and expenses.
            </p>

          </div>

        </div>

        <button
          type="button"
          className="primary-button primary-btn"
          onClick={openAddForm}
        >
          <Plus size={18} />
          Add Expense
        </button>

      </div>

      {/* =====================================================
          SUMMARY CARDS
          ===================================================== */}

      <div className="stats-grid">

        <div className="stat-card">

          <div className="stat-icon">
            <TrendingDown size={22} />
          </div>

          <div>

            <span className="stat-label">
              Total Expenses
            </span>

            <strong className="stat-value">
              {formatCurrency(
                totalExpenses
              )}
            </strong>

          </div>

        </div>

        <div className="stat-card">

          <div className="stat-icon">
            <CalendarDays size={22} />
          </div>

          <div>

            <span className="stat-label">
              This Month
            </span>

            <strong className="stat-value">
              {formatCurrency(
                currentMonthExpenses
              )}
            </strong>

          </div>

        </div>

        <div className="stat-card">

          <div className="stat-icon">
            <IndianRupee size={22} />
          </div>

          <div>

            <span className="stat-label">
              Total Entries
            </span>

            <strong className="stat-value">
              {expenseCount}
            </strong>

          </div>

        </div>

      </div>

      {/* =====================================================
          MONTHLY SPENDING OVERVIEW
          ===================================================== */}

      <div className="content-card finance-card">

        <div className="section-header">

          <div>

            <h2 className="section-title">
              This Month&apos;s Spending Overview
            </h2>

            <p className="section-description">
              Expenses are automatically compared
              with your income.
            </p>

          </div>

        </div>

        <div className="money-flow">

          <div className="flow-box flow-income">

            <span className="flow-label">
              Monthly Income
            </span>

            <div className="flow-value">
              {formatCurrency(
                currentMonthIncome
              )}
            </div>

          </div>

          <div className="flow-box flow-expense">

            <span className="flow-label">
              Monthly Expenses
            </span>

            <div className="flow-value">
              {formatCurrency(
                currentMonthExpenses
              )}
            </div>

          </div>

          <div className="flow-box flow-balance">

            <span className="flow-label">
              Remaining Balance
            </span>

            <div
              className={`flow-value ${
                currentMonthBalance < 0
                  ? "negative-value"
                  : "positive-value"
              }`}
            >
              {formatCurrency(
                currentMonthBalance
              )}
            </div>

          </div>

        </div>

        {/* =================================================
            SPENDING PROGRESS
            UNIQUE CLASS — NOT .progress-bar
            ================================================= */}

        <div className="progress-section">

          <div className="progress-header">

            <span className="progress-label">
              Income Spent
            </span>

            <span className="progress-value">
              {currentMonthIncome > 0
                ? `${spendingPercentage.toFixed(
                    1
                  )}%`
                : "0%"}
            </span>

          </div>

          <div className="progress-track">

            <div
              className="finance-progress-fill"
              style={{
                width: `${spendingPercentage}%`,
              }}
            />

          </div>

        </div>

        {currentMonthBalance < 0 && (

          <div className="finance-alert">

            <div className="finance-alert-icon">
              <TrendingDown size={20} />
            </div>

            <div>

              <div className="finance-alert-title">
                Expenses are higher than income
              </div>

              <div className="finance-alert-text">
                Your current month expenses are greater
                than your income. Review your spending
                and Budget page.
              </div>

            </div>

          </div>

        )}

      </div>

      {/* =====================================================
          EXPENSE HISTORY
          ===================================================== */}

      <div className="content-card list-card">

        <div className="section-header">

          <div>

            <h2 className="section-title">
              Expense History
            </h2>

            <p className="section-description">
              Your recorded expenses.
            </p>

          </div>

          <span className="list-count">

            {expenseCount}{" "}
            {expenseCount === 1
              ? "entry"
              : "entries"}

          </span>

        </div>

        {sortedExpenses.length === 0 ? (

          <div className="empty-state">

            <div className="empty-state-icon">
              <WalletCards size={25} />
            </div>

            <h3 className="empty-state-title">
              No expenses recorded
            </h3>

            <p className="empty-state-text">
              Add your first expense to start
              tracking your spending.
            </p>

            <button
              type="button"
              className="primary-button primary-btn"
              onClick={openAddForm}
            >
              <Plus size={18} />
              Add Expense
            </button>

          </div>

        ) : (

          <div className="finance-list expense-list">

            {sortedExpenses.map((item) => (

              <div
                className="finance-list-item expense-item"
                key={item.id}
              >

                <div className="item-left expense-main">

                  <div className="item-icon expense-icon">
                    <TrendingDown size={20} />
                  </div>

                  <div className="item-info">

                    <h3 className="item-title">
                      {item.name}
                    </h3>

                    <div className="item-meta expense-meta">

                      <span className="category-badge">
                        {item.category}
                      </span>

                      <span>•</span>

                      <span>
                        {formatDate(item.date)}
                      </span>

                    </div>

                    {item.notes && (

                      <p className="expense-notes">

                        <FileText size={14} />

                        {item.notes}

                      </p>

                    )}

                  </div>

                </div>

                <div className="item-right expense-right">

                  <strong className="item-amount">
                    {formatCurrency(
                      item.amount
                    )}
                  </strong>

                  <div className="expense-actions">

                    <button
                      type="button"
                      className="edit-btn"
                      title="Edit"
                      onClick={() =>
                        openEditForm(item)
                      }
                    >
                      <Edit3 size={17} />
                    </button>

                    <button
                      type="button"
                      className="delete-btn"
                      title="Delete"
                      onClick={() =>
                        deleteExpense(item.id)
                      }
                    >
                      <Trash2 size={17} />
                    </button>

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* =====================================================
          ADD / EDIT MODAL
          ===================================================== */}

      {showForm && (

        <div
          className="modal-overlay finance-modal-overlay"
          onMouseDown={closeForm}
        >

          <div
            className="modal-card finance-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>

                <h2 className="modal-title">

                  {editingId
                    ? "Edit Expense"
                    : "Add Expense"}

                </h2>

                <p className="section-description">

                  {editingId
                    ? "Update this expense entry."
                    : "Record a new expense entry."}

                </p>

              </div>

              <button
                type="button"
                className="icon-button close-btn"
                onClick={closeForm}
                title="Close"
              >
                <X size={20} />
              </button>

            </div>

            <form onSubmit={handleSubmit}>

              <div className="form-group">

                <label className="form-label">
                  Expense Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Example: Grocery shopping"
                  autoFocus
                />

              </div>

              <div className="form-row form-grid">

                <div className="form-group">

                  <label className="form-label">
                    <IndianRupee size={16} />
                    Amount
                  </label>

                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleChange}
                    placeholder="500"
                    min="0"
                    step="0.01"
                  />

                </div>

                <div className="form-group">

                  <label className="form-label">
                    <CalendarDays size={16} />
                    Date
                  </label>

                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                  />

                </div>

              </div>

              <div className="form-group">

                <label className="form-label">
                  Category
                </label>

                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                >

                  {categories.map(
                    (category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    )
                  )}

                </select>

              </div>

              <div className="form-group">

                <label className="form-label">
                  <FileText size={16} />
                  Notes
                </label>

                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Optional notes..."
                  rows="4"
                />

              </div>

              <div className="modal-actions button-row">

                <button
                  type="button"
                  className="secondary-button secondary-btn"
                  onClick={closeForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button primary-btn save-btn"
                >

                  <Save size={18} />

                  {editingId
                    ? "Update Expense"
                    : "Save Expense"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}