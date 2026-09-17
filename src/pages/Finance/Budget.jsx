import React, { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Plus,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  AlertTriangle,
  CalendarDays,
  IndianRupee,
  Save,
  X,
  Edit3,
} from "lucide-react";

import { getIncome } from "../../utils/db";
import {
  getItemsFromFirestore,
  saveItemsToFirestore,
  deleteItemFromFirestore,
} from "../../firebase/firestore";

const BUDGET_COLLECTION = "budgets";
const FINANCE_EVENT = "taskbar-finance-updated";

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function getCurrentMonth() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
}

function getMonthName(monthValue) {
  if (!monthValue) return "";

  const [year, month] = monthValue.split("-");

  return new Date(
    Number(year),
    Number(month) - 1,
    1
  ).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export default function Budget() {
  const [incomeList, setIncomeList] = useState([]);
  const [expenseList, setExpenseList] = useState([]);
  const [budgetList, setBudgetList] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState(
    getCurrentMonth()
  );

  const [budgetAmount, setBudgetAmount] = useState("");

  const [showBudgetForm, setShowBudgetForm] =
    useState(false);

  const [loading, setLoading] = useState(true);

  /* =========================================================
     LOAD FINANCE DATA FROM FIREBASE
     ========================================================= */

  async function loadFinanceData() {
    try {
      setLoading(true);

      const [income, expenses, budgets] =
        await Promise.all([
          getIncome(),
          getItemsFromFirestore("expenses"),
          getItemsFromFirestore(BUDGET_COLLECTION),
        ]);

      setIncomeList(
        Array.isArray(income) ? income : []
      );

      setExpenseList(
        Array.isArray(expenses) ? expenses : []
      );

      const validBudgets = Array.isArray(budgets)
        ? budgets
        : [];

      setBudgetList(validBudgets);

      const currentMonth = getCurrentMonth();

      const currentBudget = validBudgets.find(
        (item) => item.month === currentMonth
      );

      if (currentBudget) {
        setBudgetAmount(
          currentBudget.amount != null
            ? String(currentBudget.amount)
            : ""
        );
      }
    } catch (error) {
      console.error(
        "Failed to load finance data:",
        error
      );

      setIncomeList([]);
      setExpenseList([]);
      setBudgetList([]);
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     SYNC WITH FINANCE
     ========================================================= */

  useEffect(() => {
    loadFinanceData();

    const handleFinanceUpdate = () => {
      loadFinanceData();
    };

    window.addEventListener(
      FINANCE_EVENT,
      handleFinanceUpdate
    );

    return () => {
      window.removeEventListener(
        FINANCE_EVENT,
        handleFinanceUpdate
      );
    };
  }, []);

  /* =========================================================
     CURRENT MONTH BUDGET
     ========================================================= */

  const currentBudgetData = useMemo(() => {
    return (
      budgetList.find(
        (item) => item.month === selectedMonth
      ) || null
    );
  }, [budgetList, selectedMonth]);

  /* =========================================================
     MONTHLY INCOME
     ========================================================= */

  const monthIncome = useMemo(() => {
    return incomeList
      .filter((item) =>
        item.date?.startsWith(selectedMonth)
      )
      .reduce(
        (total, item) =>
          total + Number(item.amount || 0),
        0
      );
  }, [incomeList, selectedMonth]);

  /* =========================================================
     MONTHLY EXPENSES
     ========================================================= */

  const monthExpenses = useMemo(() => {
    return expenseList
      .filter((item) =>
        item.date?.startsWith(selectedMonth)
      )
      .reduce(
        (total, item) =>
          total + Number(item.amount || 0),
        0
      );
  }, [expenseList, selectedMonth]);

  /* =========================================================
     FINANCIAL CALCULATIONS
     ========================================================= */

  const budget = Number(budgetAmount || 0);

  const remainingBudget =
    budget - monthExpenses;

  const balance =
    monthIncome - monthExpenses;

  const budgetUsedPercentage =
    budget > 0
      ? Math.min(
          (monthExpenses / budget) * 100,
          100
        )
      : 0;

  const isOverBudget =
    budget > 0 &&
    monthExpenses > budget;

  const expensePercentageOfIncome =
    monthIncome > 0
      ? (monthExpenses / monthIncome) * 100
      : 0;

  const savingsRate =
    monthIncome > 0
      ? Math.max(
          (balance / monthIncome) * 100,
          0
        )
      : 0;

  const budgetPercentageOfIncome =
    monthIncome > 0
      ? (budget / monthIncome) * 100
      : 0;

  /* =========================================================
     BUDGET FORM
     ========================================================= */

  function openBudgetForm() {
    if (currentBudgetData) {
      setBudgetAmount(
        currentBudgetData.amount != null
          ? String(currentBudgetData.amount)
          : ""
      );
    } else {
      setBudgetAmount("");
    }

    setShowBudgetForm(true);
  }

  function closeBudgetForm() {
    setShowBudgetForm(false);
  }

  /* =========================================================
     MONTH CHANGE
     ========================================================= */

  function handleMonthChange(event) {
    const month = event.target.value;

    setSelectedMonth(month);

    const savedBudget = budgetList.find(
      (item) => item.month === month
    );

    if (savedBudget) {
      setBudgetAmount(
        savedBudget.amount != null
          ? String(savedBudget.amount)
          : ""
      );
    } else {
      setBudgetAmount("");
    }
  }

  /* =========================================================
     SAVE BUDGET
     ========================================================= */

  async function handleSaveBudget(event) {
    event.preventDefault();

    if (!selectedMonth) {
      alert("Please select a month.");
      return;
    }

    if (
      !budgetAmount ||
      Number(budgetAmount) <= 0
    ) {
      alert("Please enter a valid budget amount.");
      return;
    }

    const budgetData = {
      id:
        currentBudgetData?.id ||
        `budget-${selectedMonth}`,

      month: selectedMonth,

      amount: Number(budgetAmount),

      updatedAt:
        new Date().toISOString(),
    };

    try {
      await saveItemsToFirestore(
        BUDGET_COLLECTION,
        [
          ...budgetList.filter(
            (item) =>
              item.id !== budgetData.id &&
              item.month !== selectedMonth
          ),
          budgetData,
        ]
      );

      const nextBudgets = [
        ...budgetList.filter(
          (item) =>
            item.id !== budgetData.id &&
            item.month !== selectedMonth
        ),
        budgetData,
      ];

      setBudgetList(nextBudgets);

      setBudgetAmount(
        String(Number(budgetAmount))
      );

      window.dispatchEvent(
        new Event(FINANCE_EVENT)
      );

      setShowBudgetForm(false);
    } catch (error) {
      console.error(
        "Failed to save budget:",
        error
      );

      alert("Failed to save budget.");
    }
  }

  /* =========================================================
     DELETE BUDGET
     ========================================================= */

  async function handleDeleteBudget() {
    if (!currentBudgetData?.id) {
      setBudgetAmount("");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to remove this monthly budget?"
    );

    if (!confirmed) return;

    try {
      await deleteItemFromFirestore(
        BUDGET_COLLECTION,
        currentBudgetData.id
      );

      const nextBudgets = budgetList.filter(
        (item) =>
          item.id !== currentBudgetData.id
      );

      setBudgetList(nextBudgets);

      setBudgetAmount("");

      window.dispatchEvent(
        new Event(FINANCE_EVENT)
      );
    } catch (error) {
      console.error(
        "Failed to remove budget:",
        error
      );

      alert("Failed to remove budget.");
    }
  }

  return (
    <div className="finance-page page-container">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="page-header">

        <div className="page-header-left">

          <div className="page-header-icon">
            <PiggyBank size={23} />
          </div>

          <div>

            <h1 className="page-title">
              Budget
            </h1>

            <p className="page-subtitle">
              Manage your monthly budget and understand
              your spending.
            </p>

          </div>

        </div>

        <button
          type="button"
          className="primary-button primary-btn"
          onClick={openBudgetForm}
        >

          {budget > 0 ? (
            <Edit3 size={18} />
          ) : (
            <Plus size={18} />
          )}

          {budget > 0
            ? "Update Budget"
            : "Set Budget"}

        </button>

      </div>

      {/* =====================================================
          MONTHLY BUDGET
          ===================================================== */}

      <div className="content-card finance-card">

        <div className="section-header">

          <div>

            <h2 className="section-title">
              Monthly Budget
            </h2>

            <p className="section-description">
              {getMonthName(selectedMonth)}
            </p>

          </div>

          {budget > 0 && (
            <button
              type="button"
              className="secondary-button secondary-btn"
              onClick={handleDeleteBudget}
            >
              <X size={17} />
              Remove Budget
            </button>
          )}

        </div>

        <div className="finance-budget-display">

          <div className="budget-main-amount">

            <span className="flow-label">
              Monthly Budget
            </span>

            <strong className="flow-value">

              {budget > 0
                ? formatCurrency(budget)
                : "Not Set"}

            </strong>

          </div>

          <div className="budget-month-info">

            <CalendarDays size={18} />

            <span>
              {getMonthName(selectedMonth)}
            </span>

          </div>

        </div>

        {budget === 0 && (

          <div className="finance-alert">

            <div className="finance-alert-icon">
              <PiggyBank size={20} />
            </div>

            <div>

              <div className="finance-alert-title">
                No budget set
              </div>

              <div className="finance-alert-text">
                Set a monthly budget to start tracking
                your spending automatically.
              </div>

            </div>

          </div>

        )}

      </div>

      {/* =====================================================
          SUMMARY
          ===================================================== */}

      <div className="stats-grid">

        <div className="stat-card">

          <div className="stat-icon">
            <TrendingUp size={22} />
          </div>

          <div>

            <span className="stat-label">
              Income
            </span>

            <strong className="stat-value">
              {formatCurrency(monthIncome)}
            </strong>

          </div>

        </div>

        <div className="stat-card">

          <div className="stat-icon">
            <TrendingDown size={22} />
          </div>

          <div>

            <span className="stat-label">
              Expenses
            </span>

            <strong className="stat-value">
              {formatCurrency(monthExpenses)}
            </strong>

          </div>

        </div>

        <div className="stat-card">

          <div className="stat-icon">
            <Wallet size={22} />
          </div>

          <div>

            <span className="stat-label">
              Balance
            </span>

            <strong
              className={`stat-value ${
                balance < 0
                  ? "negative-value"
                  : "positive-value"
              }`}
            >
              {formatCurrency(balance)}
            </strong>

          </div>

        </div>

        <div className="stat-card">

          <div className="stat-icon">
            <PiggyBank size={22} />
          </div>

          <div>

            <span className="stat-label">
              Budget Remaining
            </span>

            <strong
              className={`stat-value ${
                remainingBudget < 0
                  ? "negative-value"
                  : "positive-value"
              }`}
            >

              {budget > 0
                ? formatCurrency(
                    remainingBudget
                  )
                : "Not Set"}

            </strong>

          </div>

        </div>

      </div>

      {/* =====================================================
          MONTH SELECTOR
          ===================================================== */}

      <div className="content-card finance-card">

        <div className="section-header">

          <div>

            <h2 className="section-title">
              View Month
            </h2>

            <p className="section-description">
              Check income, expenses and budget for any
              month.
            </p>

          </div>

        </div>

        <div className="form-group">

          <label className="form-label">

            <CalendarDays size={16} />

            Select Month

          </label>

          <input
            type="month"
            value={selectedMonth}
            onChange={handleMonthChange}
          />

        </div>

      </div>

      {/* =====================================================
          BUDGET USAGE
          ===================================================== */}

      <div className="content-card finance-card">

        <div className="section-header">

          <div>

            <h2 className="section-title">
              Budget Usage
            </h2>

            <p className="section-description">

              {budget > 0
                ? `${formatCurrency(
                    monthExpenses
                  )} spent from ${formatCurrency(
                    budget
                  )}`
                : "Set a monthly budget to track your spending."}

            </p>

          </div>

          {budget > 0 && (

            <strong className="progress-value">
              {Math.round(
                budgetUsedPercentage
              )}%
            </strong>

          )}

        </div>

        {budget > 0 ? (

          <>

            <div className="progress-section">

              <div className="progress-header">

                <span className="progress-label">
                  Spending Progress
                </span>

                <span className="progress-value">
                  {Math.round(
                    budgetUsedPercentage
                  )}%
                </span>

              </div>

              <div className="progress-track">

                <div
                  className={`finance-progress-fill ${
                    isOverBudget
                      ? "progress-danger"
                      : ""
                  }`}
                  style={{
                    width: `${budgetUsedPercentage}%`,
                  }}
                />

              </div>

            </div>

            <div className="money-flow">

              <div className="flow-box flow-expense">

                <span className="flow-label">
                  Spent
                </span>

                <div className="flow-value">
                  {formatCurrency(
                    monthExpenses
                  )}
                </div>

              </div>

              <div className="flow-box flow-balance">

                <span className="flow-label">
                  Remaining
                </span>

                <div
                  className={`flow-value ${
                    remainingBudget < 0
                      ? "negative-value"
                      : "positive-value"
                  }`}
                >
                  {formatCurrency(
                    remainingBudget
                  )}
                </div>

              </div>

            </div>

          </>

        ) : (

          <div className="empty-state">

            <div className="empty-state-icon">
              <PiggyBank size={25} />
            </div>

            <h3 className="empty-state-title">
              No budget set
            </h3>

            <p className="empty-state-text">
              Set your monthly budget to start tracking
              your spending.
            </p>

            <button
              type="button"
              className="primary-button primary-btn"
              onClick={openBudgetForm}
            >
              <Plus size={18} />
              Set Budget
            </button>

          </div>

        )}

      </div>

      {/* =====================================================
          MONTHLY FINANCIAL FLOW
          ===================================================== */}

      <div className="content-card finance-card">

        <div className="section-header">

          <div>

            <h2 className="section-title">
              Monthly Financial Flow
            </h2>

            <p className="section-description">
              Income and expenses automatically affect
              your available balance.
            </p>

          </div>

        </div>

        <div className="money-flow">

          <div className="flow-box flow-income">

            <span className="flow-label">
              Monthly Income
            </span>

            <div className="flow-value">
              {formatCurrency(monthIncome)}
            </div>

          </div>

          <div className="flow-box flow-expense">

            <span className="flow-label">
              Monthly Expenses
            </span>

            <div className="flow-value">
              {formatCurrency(monthExpenses)}
            </div>

          </div>

          <div className="flow-box flow-balance">

            <span className="flow-label">
              Available Balance
            </span>

            <div
              className={`flow-value ${
                balance < 0
                  ? "negative-value"
                  : "positive-value"
              }`}
            >
              {formatCurrency(balance)}
            </div>

          </div>

        </div>

      </div>

      {/* =====================================================
          FINANCIAL OVERVIEW
          ===================================================== */}

      <div className="content-card finance-card">

        <div className="section-header">

          <div>

            <h2 className="section-title">
              Financial Overview
            </h2>

            <p className="section-description">
              Quick financial analysis for{" "}
              {getMonthName(selectedMonth)}.
            </p>

          </div>

        </div>

        <div className="financial-overview">

          <div className="overview-card">

            <span className="overview-label">
              Savings Rate
            </span>

            <strong className="overview-value">

              {monthIncome > 0
                ? `${savingsRate.toFixed(1)}%`
                : "0%"}

            </strong>

          </div>

          <div className="overview-card">

            <span className="overview-label">
              Expenses / Income
            </span>

            <strong className="overview-value">

              {monthIncome > 0
                ? `${expensePercentageOfIncome.toFixed(
                    1
                  )}%`
                : "0%"}

            </strong>

          </div>

          <div className="overview-card">

            <span className="overview-label">
              Budget / Income
            </span>

            <strong className="overview-value">

              {monthIncome > 0 && budget > 0
                ? `${budgetPercentageOfIncome.toFixed(
                    1
                  )}%`
                : "Not Set"}

            </strong>

          </div>

        </div>

      </div>

      {/* =====================================================
          BUDGET STATUS
          ===================================================== */}

      <div className="content-card finance-card">

        <div className="section-header">

          <div>

            <h2 className="section-title">
              Budget Status
            </h2>

            <p className="section-description">
              Current status of your monthly spending.
            </p>

          </div>

        </div>

        {isOverBudget ? (

          <div className="finance-alert">

            <div className="finance-alert-icon">
              <AlertTriangle size={21} />
            </div>

            <div>

              <div className="finance-alert-title">
                Budget exceeded
              </div>

              <div className="finance-alert-text">

                You have exceeded your monthly budget by{" "}

                <strong>
                  {formatCurrency(
                    Math.abs(
                      remainingBudget
                    )
                  )}
                </strong>
                .

              </div>

            </div>

          </div>

        ) : budget > 0 ? (

          <div className="finance-success">

            <div className="finance-success-icon">
              <PiggyBank size={21} />
            </div>

            <div>

              <div className="finance-success-title">
                Budget is under control
              </div>

              <div className="finance-success-text">

                You have{" "}

                <strong>
                  {formatCurrency(
                    Math.max(
                      remainingBudget,
                      0
                    )
                  )}
                </strong>{" "}

                remaining from your budget.

              </div>

            </div>

          </div>

        ) : (

          <div className="empty-state">

            <div className="empty-state-icon">
              <PiggyBank size={25} />
            </div>

            <h3 className="empty-state-title">
              Budget not configured
            </h3>

            <p className="empty-state-text">
              Set a budget to receive spending status
              and alerts.
            </p>

            <button
              type="button"
              className="primary-button primary-btn"
              onClick={openBudgetForm}
            >
              <Plus size={18} />
              Set Budget
            </button>

          </div>

        )}

      </div>

      {/* =====================================================
          SET / UPDATE BUDGET MODAL
          ===================================================== */}

      {showBudgetForm && (

        <div
          className="modal-overlay finance-modal-overlay"
          onMouseDown={closeBudgetForm}
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

                  {budget > 0
                    ? "Update Budget"
                    : "Set Budget"}

                </h2>

                <p className="section-description">

                  Set how much you plan to spend for
                  the selected month.

                </p>

              </div>

              <button
                type="button"
                className="icon-button close-btn"
                onClick={closeBudgetForm}
                title="Close"
              >
                <X size={20} />
              </button>

            </div>

            <form onSubmit={handleSaveBudget}>

              <div className="form-group">

                <label className="form-label">

                  <CalendarDays size={16} />

                  Budget Month

                </label>

                <input
                  type="month"
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  required
                />

              </div>

              <div className="form-group">

                <label className="form-label">

                  <IndianRupee size={16} />

                  Monthly Budget

                </label>

                <input
                  type="number"
                  value={budgetAmount}
                  onChange={(event) =>
                    setBudgetAmount(
                      event.target.value
                    )
                  }
                  placeholder="Example: 20000"
                  min="1"
                  step="0.01"
                  autoFocus
                  required
                />

              </div>

              <div className="finance-alert">

                <div className="finance-alert-icon">
                  <Wallet size={19} />
                </div>

                <div>

                  <div className="finance-alert-title">
                    Budget calculation
                  </div>

                  <div className="finance-alert-text">

                    Your budget will be compared with
                    expenses automatically. Income and
                    expenses are already connected to this
                    page.

                  </div>

                </div>

              </div>

              <div className="modal-actions button-row">

                <button
                  type="button"
                  className="secondary-button secondary-btn"
                  onClick={closeBudgetForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button primary-btn save-btn"
                >

                  <Save size={18} />

                  {budget > 0
                    ? "Update Budget"
                    : "Save Budget"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}