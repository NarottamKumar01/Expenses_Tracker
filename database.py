import os
import psycopg2
import psycopg2.extras
from datetime import datetime

# Use environment variable if available, otherwise fallback to the free Neon database
DATABASE_URL = os.environ.get(
    "DATABASE_URL", 
    "postgresql://neondb_owner:npg_j4TvHaUiJ3pN@ep-shiny-hill-ar6fnefa-pooler.c-4.us-west-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
)

def get_connection():
    conn = psycopg2.connect(DATABASE_URL)
    return conn

def execute_query(query, params=None, fetch=False, fetchone=False):
    conn = get_connection()
    c = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        c.execute(query, params)
        if fetch:
            res = c.fetchall()
            return [dict(r) for r in res]
        elif fetchone:
            res = c.fetchone()
            return dict(res) if res else None
        else:
            conn.commit()
    finally:
        c.close()
        conn.close()

def init_db():
    conn = get_connection()
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            note TEXT DEFAULT '',
            date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS income (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            source TEXT NOT NULL,
            note TEXT DEFAULT '',
            date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS budgets (
            id SERIAL PRIMARY KEY,
            category TEXT NOT NULL UNIQUE,
            monthly_limit REAL NOT NULL,
            month TEXT NOT NULL
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS savings_goals (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            target_amount REAL NOT NULL,
            current_amount REAL DEFAULT 0,
            deadline TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    c.close()
    conn.close()

def add_expense(title, amount, category, note, date):
    execute_query(
        "INSERT INTO expenses (title, amount, category, note, date) VALUES (%s, %s, %s, %s, %s)",
        (title, amount, category, note, date)
    )

def get_expenses(category=None, start_date=None, end_date=None, search=None):
    query = "SELECT * FROM expenses WHERE 1=1"
    params = []
    if category:
        query += " AND category = %s"
        params.append(category)
    if start_date:
        query += " AND date >= %s"
        params.append(start_date)
    if end_date:
        query += " AND date <= %s"
        params.append(end_date)
    if search:
        query += " AND (title ILIKE %s OR note ILIKE %s)"
        params.extend([f"%{search}%", f"%{search}%"])
    query += " ORDER BY date DESC, created_at DESC"
    return execute_query(query, tuple(params), fetch=True)

def get_expense_by_id(expense_id):
    return execute_query("SELECT * FROM expenses WHERE id = %s", (expense_id,), fetchone=True)

def update_expense(expense_id, title, amount, category, note, date):
    execute_query(
        "UPDATE expenses SET title=%s, amount=%s, category=%s, note=%s, date=%s WHERE id=%s",
        (title, amount, category, note, date, expense_id)
    )

def delete_expense(expense_id):
    execute_query("DELETE FROM expenses WHERE id = %s", (expense_id,))

def add_income(title, amount, source, note, date):
    execute_query(
        "INSERT INTO income (title, amount, source, note, date) VALUES (%s, %s, %s, %s, %s)",
        (title, amount, source, note, date)
    )

def get_income(start_date=None, end_date=None):
    query = "SELECT * FROM income WHERE 1=1"
    params = []
    if start_date:
        query += " AND date >= %s"
        params.append(start_date)
    if end_date:
        query += " AND date <= %s"
        params.append(end_date)
    query += " ORDER BY date DESC"
    return execute_query(query, tuple(params), fetch=True)

def delete_income(income_id):
    execute_query("DELETE FROM income WHERE id = %s", (income_id,))

def set_budget(category, monthly_limit, month):
    execute_query(
        """INSERT INTO budgets (category, monthly_limit, month)
           VALUES (%s, %s, %s)
           ON CONFLICT (category) DO UPDATE SET monthly_limit=EXCLUDED.monthly_limit, month=EXCLUDED.month""",
        (category, monthly_limit, month)
    )

def get_budgets(month=None):
    if month:
        return execute_query("SELECT * FROM budgets WHERE month = %s", (month,), fetch=True)
    return execute_query("SELECT * FROM budgets", fetch=True)

def delete_budget(budget_id):
    execute_query("DELETE FROM budgets WHERE id = %s", (budget_id,))

def add_savings_goal(title, target_amount, deadline):
    execute_query(
        "INSERT INTO savings_goals (title, target_amount, deadline) VALUES (%s, %s, %s)",
        (title, target_amount, deadline)
    )

def get_savings_goals():
    return execute_query("SELECT * FROM savings_goals ORDER BY created_at DESC", fetch=True)

def update_savings_goal_amount(goal_id, amount):
    execute_query(
        "UPDATE savings_goals SET current_amount = current_amount + %s WHERE id = %s",
        (amount, goal_id)
    )

def delete_savings_goal(goal_id):
    execute_query("DELETE FROM savings_goals WHERE id = %s", (goal_id,))

def get_dashboard_stats(month):
    total_expenses_row = execute_query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date LIKE %s",
        (f"{month}%",), fetchone=True
    )
    total_expenses = total_expenses_row["total"] if total_expenses_row else 0

    total_income_row = execute_query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM income WHERE date LIKE %s",
        (f"{month}%",), fetchone=True
    )
    total_income = total_income_row["total"] if total_income_row else 0

    by_category = execute_query(
        """SELECT category, SUM(amount) as total
           FROM expenses WHERE date LIKE %s
           GROUP BY category ORDER BY total DESC""",
        (f"{month}%",), fetch=True
    )

    daily = execute_query(
        """SELECT date, SUM(amount) as total
           FROM expenses WHERE date LIKE %s
           GROUP BY date ORDER BY date""",
        (f"{month}%",), fetch=True
    )

    monthly_trend = execute_query(
        """SELECT substr(date,1,7) as month, SUM(amount) as total
           FROM expenses
           GROUP BY substr(date,1,7)
           ORDER BY month DESC LIMIT 6""",
        fetch=True
    )

    recent = execute_query(
        "SELECT * FROM expenses ORDER BY date DESC, created_at DESC LIMIT 5",
        fetch=True
    )

    return {
        "total_expenses": round(total_expenses, 2),
        "total_income": round(total_income, 2),
        "balance": round(total_income - total_expenses, 2),
        "by_category": by_category,
        "daily": daily,
        "monthly_trend": monthly_trend[::-1] if monthly_trend else [],
        "recent": recent,
    }
