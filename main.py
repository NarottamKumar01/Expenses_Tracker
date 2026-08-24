from flask import Flask, render_template
from flask_cors import CORS
import database as db

app = Flask(__name__)
CORS(app)

from routes.expenses import expenses_bp
from routes.income import income_bp
from routes.budgets import budgets_bp
from routes.reports import reports_bp
from routes.dashboard import dashboard_bp

app.register_blueprint(expenses_bp)
app.register_blueprint(income_bp)
app.register_blueprint(budgets_bp)
app.register_blueprint(reports_bp)
app.register_blueprint(dashboard_bp)


@app.route("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    db.init_db()
    print("\n>>> Expenses Tracker is running!")
    print(">>> Open your browser at: http://localhost:5000\n")
    app.run(debug=True, port=5000)