from flask import Blueprint, request, jsonify
import database as db

income_bp = Blueprint("income", __name__)

INCOME_SOURCES = [
    "Salary", "Freelance", "Business", "Investments",
    "Rental", "Gift", "Refund", "Others"
]


@income_bp.route("/api/income/sources", methods=["GET"])
def get_sources():
    return jsonify(INCOME_SOURCES)


@income_bp.route("/api/income", methods=["GET"])
def list_income():
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    income = db.get_income(start_date, end_date)
    return jsonify(income)


@income_bp.route("/api/income", methods=["POST"])
def create_income():
    data = request.get_json()
    required = ["title", "amount", "source", "date"]
    if not all(k in data for k in required):
        return jsonify({"error": "Missing required fields"}), 400
    try:
        amount = float(data["amount"])
        if amount <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "Amount must be a positive number"}), 400

    db.add_income(
        data["title"], amount, data["source"],
        data.get("note", ""), data["date"]
    )
    return jsonify({"message": "Income added successfully"}), 201


@income_bp.route("/api/income/<int:income_id>", methods=["DELETE"])
def remove_income(income_id):
    db.delete_income(income_id)
    return jsonify({"message": "Income deleted successfully"})
