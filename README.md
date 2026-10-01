# Expenses Tracker

A comprehensive web-based Expenses Tracker application built with Python (Flask) and SQLite. 

## Features
- **Dashboard:** Get a visual overview of your financial health with total income, total expenses, current balance, and trend analysis.
- **Expense Management:** Add, update, view, and delete expenses categorized by type.
- **Income Tracking:** Keep track of various income sources.
- **Budgeting:** Set monthly budget limits per category to keep your spending in check.
- **Savings Goals:** Create and track progress on your savings targets with deadlines.
- **Reports:** Generate and export financial reports.

## Tech Stack
- **Backend:** Python, Flask, Flask-CORS
- **Database:** SQLite
- **PDF Generation:** ReportLab
- **Frontend:** HTML/CSS/JavaScript (via Flask templates)

## Prerequisites
- Python 3.x

## Installation & Setup

1. **Navigate to the Project Directory:**
   ```bash
   cd "Expenses Tracker"
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Application:**
   ```bash
   python main.py
   ```
   The database (`expenses.db`) will be initialized automatically on the first run.

4. **Access the App:**
   Open your web browser and go to `http://localhost:5000`

## Project Structure
- `main.py`: Entry point of the Flask application.
- `database.py`: Contains SQLite database connection, schema initialization, and CRUD operations.
- `requirements.txt`: Python package dependencies.
- `routes/`: Flask blueprints for different modules (dashboard, expenses, income, budgets, reports).
- `templates/`: HTML templates for the frontend.
- `static/`: Static assets (CSS, JS, images).

## License
Check the `LICENSE` file in the project for more details.
