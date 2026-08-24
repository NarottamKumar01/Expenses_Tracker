from flask import Blueprint, request, jsonify, make_response
import database as db
import csv
import io
from datetime import datetime

reports_bp = Blueprint("reports", __name__)


@reports_bp.route("/api/export/csv", methods=["GET"])
def export_csv():
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    category = request.args.get("category")

    expenses = db.get_expenses(category, start_date, end_date)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Title", "Amount (₹)", "Category", "Note", "Date"])
    for e in expenses:
        writer.writerow([e["id"], e["title"], e["amount"], e["category"], e["note"], e["date"]])

    total = sum(e["amount"] for e in expenses)
    writer.writerow([])
    writer.writerow(["", "TOTAL", total, "", "", ""])

    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = f'attachment; filename="expenses_{datetime.now().strftime("%Y%m%d")}.csv"'
    response.headers["Content-Type"] = "text/csv"
    return response


@reports_bp.route("/api/export/income-csv", methods=["GET"])
def export_income_csv():
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    income_list = db.get_income(start_date, end_date)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Title", "Amount (₹)", "Source", "Note", "Date"])
    for i in income_list:
        writer.writerow([i["id"], i["title"], i["amount"], i["source"], i["note"], i["date"]])

    total = sum(i["amount"] for i in income_list)
    writer.writerow([])
    writer.writerow(["", "TOTAL", total, "", "", ""])

    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = f'attachment; filename="income_{datetime.now().strftime("%Y%m%d")}.csv"'
    response.headers["Content-Type"] = "text/csv"
    return response


@reports_bp.route("/api/summary", methods=["GET"])
def monthly_summary():
    month = request.args.get("month", datetime.now().strftime("%Y-%m"))
    expenses = db.get_expenses(start_date=f"{month}-01", end_date=f"{month}-31")
    income_list = db.get_income(start_date=f"{month}-01", end_date=f"{month}-31")

    total_expenses = sum(e["amount"] for e in expenses)
    total_income = sum(i["amount"] for i in income_list)
    by_category = {}
    for e in expenses:
        by_category[e["category"]] = by_category.get(e["category"], 0) + e["amount"]

    return jsonify({
        "month": month,
        "total_expenses": round(total_expenses, 2),
        "total_income": round(total_income, 2),
        "net_savings": round(total_income - total_expenses, 2),
        "by_category": [{"category": k, "total": round(v, 2)} for k, v in sorted(by_category.items(), key=lambda x: -x[1])],
        "expense_count": len(expenses),
        "income_count": len(income_list)
    })
