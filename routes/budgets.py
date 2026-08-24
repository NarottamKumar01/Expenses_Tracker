from flask import Blueprint, request, jsonify
import database as db
from datetime import datetime

budgets_bp = Blueprint("budgets", __name__)


@budgets_bp.route("/api/budgets", methods=["GET"])
def list_budgets():
    month = request.args.get("month", datetime.now().strftime("%Y-%m"))
    budgets = db.get_budgets(month)

    # Attach current spending for each budget
    expenses = db.get_expenses(start_date=f"{month}-01", end_date=f"{month}-31")
    spending_by_cat = {}
    for exp in expenses:
        spending_by_cat[exp["category"]] = spending_by_cat.get(exp["category"], 0) + exp["amount"]

    result = []
    for b in budgets:
        spent = spending_by_cat.get(b["category"], 0)
        result.append({
            **b,
            "spent": round(spent, 2),
            "remaining": round(b["monthly_limit"] - spent, 2),
            "percentage": round((spent / b["monthly_limit"]) * 100, 1) if b["monthly_limit"] > 0 else 0
        })
    return jsonify(result)


@budgets_bp.route("/api/budgets", methods=["POST"])
def create_budget():
    data = request.get_json()
    required = ["category", "monthly_limit"]
    if not all(k in data for k in required):
        return jsonify({"error": "Missing required fields"}), 400
    try:
        limit = float(data["monthly_limit"])
        if limit <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "Limit must be a positive number"}), 400

    month = data.get("month", datetime.now().strftime("%Y-%m"))
    db.set_budget(data["category"], limit, month)
    return jsonify({"message": "Budget set successfully"}), 201


@budgets_bp.route("/api/budgets/<int:budget_id>", methods=["DELETE"])
def remove_budget(budget_id):
    db.delete_budget(budget_id)
    return jsonify({"message": "Budget deleted successfully"})


@budgets_bp.route("/api/savings-goals", methods=["GET"])
def list_goals():
    goals = db.get_savings_goals()
    return jsonify(goals)


@budgets_bp.route("/api/savings-goals", methods=["POST"])
def create_goal():
    data = request.get_json()
    required = ["title", "target_amount"]
    if not all(k in data for k in required):
        return jsonify({"error": "Missing required fields"}), 400
    try:
        target = float(data["target_amount"])
    except (ValueError, TypeError):
        return jsonify({"error": "Target must be a number"}), 400
    db.add_savings_goal(data["title"], target, data.get("deadline", ""))
    return jsonify({"message": "Savings goal created"}), 201


@budgets_bp.route("/api/savings-goals/<int:goal_id>/contribute", methods=["POST"])
def contribute_goal(goal_id):
    data = request.get_json()
    try:
        amount = float(data["amount"])
    except (ValueError, TypeError, KeyError):
        return jsonify({"error": "Invalid amount"}), 400
    db.update_savings_goal_amount(goal_id, amount)
    return jsonify({"message": "Contribution added"})


@budgets_bp.route("/api/savings-goals/<int:goal_id>", methods=["DELETE"])
def remove_goal(goal_id):
    db.delete_savings_goal(goal_id)
    return jsonify({"message": "Goal deleted"})
