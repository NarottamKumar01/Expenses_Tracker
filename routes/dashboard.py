from flask import Blueprint, request, jsonify
from datetime import datetime
import database as db

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/api/dashboard", methods=["GET"])
def get_dashboard():
    month = request.args.get("month", datetime.now().strftime("%Y-%m"))
    stats = db.get_dashboard_stats(month)
    return jsonify(stats)
