from flask import Blueprint, request, jsonify
import database as db

expenses_bp = Blueprint("expenses", __name__)

CATEGORIES = [
    "Food & Dining", "Transportation", "Shopping", "Bills & Utilities",
    "Entertainment", "Education", "Health & Medical", "Travel",
    "Groceries", "Personal Care", "Investments", "Others"
]


@expenses_bp.route("/api/categories", methods=["GET"])
def get_categories():
    return jsonify(CATEGORIES)


@expenses_bp.route("/api/expenses", methods=["GET"])
def list_expenses():
    category = request.args.get("category")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    search = request.args.get("search")
    expenses = db.get_expenses(category, start_date, end_date, search)
    return jsonify(expenses)


@expenses_bp.route("/api/expenses", methods=["POST"])
def create_expense():
    data = request.get_json()
    required = ["title", "amount", "category", "date"]
    if not all(k in data for k in required):
        return jsonify({"error": "Missing required fields"}), 400
    try:
        amount = float(data["amount"])
        if amount <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "Amount must be a positive number"}), 400

    db.add_expense(
        data["title"], amount, data["category"],
        data.get("note", ""), data["date"]
    )
    return jsonify({"message": "Expense added successfully"}), 201


@expenses_bp.route("/api/expenses/<int:expense_id>", methods=["GET"])
def get_expense(expense_id):
    expense = db.get_expense_by_id(expense_id)
    if not expense:
        return jsonify({"error": "Expense not found"}), 404
    return jsonify(expense)


@expenses_bp.route("/api/expenses/<int:expense_id>", methods=["PUT"])
def edit_expense(expense_id):
    data = request.get_json()
    expense = db.get_expense_by_id(expense_id)
    if not expense:
        return jsonify({"error": "Expense not found"}), 404
    try:
        amount = float(data["amount"])
    except (ValueError, TypeError, KeyError):
        return jsonify({"error": "Invalid amount"}), 400
    db.update_expense(
        expense_id, data.get("title", expense["title"]),
        amount, data.get("category", expense["category"]),
        data.get("note", expense["note"]), data.get("date", expense["date"])
    )
    return jsonify({"message": "Expense updated successfully"})


@expenses_bp.route("/api/expenses/<int:expense_id>", methods=["DELETE"])
def remove_expense(expense_id):
    expense = db.get_expense_by_id(expense_id)
    if not expense:
        return jsonify({"error": "Expense not found"}), 404
    db.delete_expense(expense_id)
    return jsonify({"message": "Expense deleted successfully"})
