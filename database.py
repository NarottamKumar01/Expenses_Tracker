import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "expenses.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_connection()
    c = conn.cursor()

    
    c.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            note TEXT DEFAULT '',
            date TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS income (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            source TEXT NOT NULL,
            note TEXT DEFAULT '',
            date TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)


    c.execute("""
        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL UNIQUE,
            monthly_limit REAL NOT NULL,
            month TEXT NOT NULL
        )
    """)


    c.execute("""
        CREATE TABLE IF NOT EXISTS savings_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            target_amount REAL NOT NULL,
            current_amount REAL DEFAULT 0,
            deadline TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()



def add_expense(title, amount, category, note, date):
    conn = get_connection()
    conn.execute(
        "INSERT INTO expenses (title, amount, category, note, date) VALUES (?, ?, ?, ?, ?)",
        (title, amount, category, note, date)
    )
    conn.commit()
    conn.close()


def get_expenses(category=None, start_date=None, end_date=None, search=None):
    conn = get_connection()
    query = "SELECT * FROM expenses WHERE 1=1"
    params = []
    if category:
        query += " AND category = ?"
        params.append(category)
    if start_date:
        query += " AND date >= ?"
        params.append(start_date)
    if end_date:
        query += " AND date <= ?"
        params.append(end_date)
    if search:
        query += " AND (title LIKE ? OR note LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
    query += " ORDER BY date DESC, created_at DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_expense_by_id(expense_id):
    conn = get_connection()
    row = conn.execute("SELECT * FROM expenses WHERE id = ?", (expense_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def update_expense(expense_id, title, amount, category, note, date):
    conn = get_connection()
    conn.execute(
        "UPDATE expenses SET title=?, amount=?, category=?, note=?, date=? WHERE id=?",
        (title, amount, category, note, date, expense_id)
    )
    conn.commit()
    conn.close()


def delete_expense(expense_id):
    conn = get_connection()
    conn.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
    conn.commit()
    conn.close()


def add_income(title, amount, source, note, date):
    conn = get_connection()
    conn.execute(
        "INSERT INTO income (title, amount, source, note, date) VALUES (?, ?, ?, ?, ?)",
        (title, amount, source, note, date)
    )
    conn.commit()
    conn.close()


def get_income(start_date=None, end_date=None):
    conn = get_connection()
    query = "SELECT * FROM income WHERE 1=1"
    params = []
    if start_date:
        query += " AND date >= ?"
        params.append(start_date)
    if end_date:
        query += " AND date <= ?"
        params.append(end_date)
    query += " ORDER BY date DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_income(income_id):
    conn = get_connection()
    conn.execute("DELETE FROM income WHERE id = ?", (income_id,))
    conn.commit()
    conn.close()




def set_budget(category, monthly_limit, month):
    conn = get_connection()
    conn.execute(
        """INSERT INTO budgets (category, monthly_limit, month)
           VALUES (?, ?, ?)
           ON CONFLICT(category) DO UPDATE SET monthly_limit=excluded.monthly_limit, month=excluded.month""",
        (category, monthly_limit, month)
    )
    conn.commit()
    conn.close()


def get_budgets(month=None):
    conn = get_connection()
    if month:
        rows = conn.execute("SELECT * FROM budgets WHERE month = ?", (month,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM budgets").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_budget(budget_id):
    conn = get_connection()
    conn.execute("DELETE FROM budgets WHERE id = ?", (budget_id,))
    conn.commit()
    conn.close()




def add_savings_goal(title, target_amount, deadline):
    conn = get_connection()
    conn.execute(
        "INSERT INTO savings_goals (title, target_amount, deadline) VALUES (?, ?, ?)",
        (title, target_amount, deadline)
    )
    conn.commit()
    conn.close()


def get_savings_goals():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM savings_goals ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_savings_goal_amount(goal_id, amount):
    conn = get_connection()
    conn.execute(
        "UPDATE savings_goals SET current_amount = current_amount + ? WHERE id = ?",
        (amount, goal_id)
    )
    conn.commit()
    conn.close()


def delete_savings_goal(goal_id):
    conn = get_connection()
    conn.execute("DELETE FROM savings_goals WHERE id = ?", (goal_id,))
    conn.commit()
    conn.close()




def get_dashboard_stats(month):
    conn = get_connection()

    
    total_expenses = conn.execute(
        "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date LIKE ?",
        (f"{month}%",)
    ).fetchone()["total"]

  
    total_income = conn.execute(
        "SELECT COALESCE(SUM(amount), 0) as total FROM income WHERE date LIKE ?",
        (f"{month}%",)
    ).fetchone()["total"]

    by_category = conn.execute(
        """SELECT category, SUM(amount) as total
           FROM expenses WHERE date LIKE ?
           GROUP BY category ORDER BY total DESC""",
        (f"{month}%",)
    ).fetchall()

   
    daily = conn.execute(
        """SELECT date, SUM(amount) as total
           FROM expenses WHERE date LIKE ?
           GROUP BY date ORDER BY date""",
        (f"{month}%",)
    ).fetchall()

    monthly_trend = conn.execute(
        """SELECT substr(date,1,7) as month, SUM(amount) as total
           FROM expenses
           GROUP BY substr(date,1,7)
           ORDER BY month DESC LIMIT 6"""
    ).fetchall()

    recent = conn.execute(
        "SELECT * FROM expenses ORDER BY date DESC, created_at DESC LIMIT 5"
    ).fetchall()

    conn.close()

    return {
        "total_expenses": round(total_expenses, 2),
        "total_income": round(total_income, 2),
        "balance": round(total_income - total_expenses, 2),
        "by_category": [dict(r) for r in by_category],
        "daily": [dict(r) for r in daily],
        "monthly_trend": [dict(r) for r in reversed(monthly_trend)],
        "recent": [dict(r) for r in recent],
    }
