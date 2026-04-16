from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import random

from database import get_db_connection
from app.services.exam_service import (
    create_exam_with_questions,
    add_question,
    get_all_exams,
    get_questions_by_exam,
    save_answer,
    submit_exam,
    log_cheat_event,
    start_exam_if_not_started,
    is_exam_time_over,
    get_exam_results,
    get_saved_answers,
    get_exam_by_code,
    get_exam_attempt,
)

exam_bp = Blueprint("exam", __name__)


def _normalize_exam_datetime(value):
    if value is None:
        return None
    if isinstance(value, str):
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M"):
            try:
                return datetime.strptime(value, fmt)
            except:
                continue
    return value


# ---------------- CREATE ----------------
@exam_bp.route("/create-with-questions", methods=["POST"])
@jwt_required()
def create_exam_with_questions_api():
    user_id = int(get_jwt_identity())
    data = request.json or {}

    if not data.get("title"):
        return jsonify({"error": "Title is required"}), 400

    questions = data.get("questions", [])
    if not questions:
        return jsonify({"error": "Add at least one question"}), 400

    exam_code, exam_id = create_exam_with_questions(
        title=data["title"],
        duration_minutes=int(data.get("duration_minutes", 30)),
        total_marks=int(data.get("total_marks", 10)),
        admin_id=user_id,
        start_time=data.get("start_time"),
        end_time=data.get("end_time"),
        questions=questions,
    )

    return jsonify({
        "exam_code": exam_code,
        "exam_id": exam_id
    }), 201


# ---------------- JOIN EXAM (FIXED) ----------------
@exam_bp.route("/join", methods=["POST"])
@jwt_required()
def join_exam():
    user_id = int(get_jwt_identity())
    data = request.json or {}
    exam_code = (data.get("exam_code") or "").strip().upper()

    if not exam_code:
        return jsonify({"error": "exam_code required"}), 400

    exam = get_exam_by_code(exam_code)
    if not exam:
        return jsonify({"error": "Invalid exam code"}), 404

    now = datetime.utcnow()

    start = _normalize_exam_datetime(exam.get("start_time"))
    end = _normalize_exam_datetime(exam.get("end_time"))

    if start and now < start:
        return jsonify({"error": "Exam not started"}), 403

    if end and now > end:
        return jsonify({"error": "Exam ended"}), 403

    attempt = get_exam_attempt(user_id, exam["exam_id"])
    if attempt and attempt["status"] == "SUBMITTED":
        return jsonify({"error": "Already completed"}), 403

    # ✅ START EXAM HERE
    session_token = start_exam_if_not_started(user_id, exam["exam_id"])

    return jsonify({
        "exam": exam,
        "session_token": session_token
    }), 200


# ---------------- QUESTIONS (FIXED) ----------------
@exam_bp.route("/questions/<int:exam_id>", methods=["GET"])
@jwt_required()
def get_exam_questions(exam_id):
    user_id = int(get_jwt_identity())

    attempt = get_exam_attempt(user_id, exam_id)
    if not attempt:
        return jsonify({"error": "Join exam first"}), 403

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM exams WHERE exam_id=%s", (exam_id,))
    exam = cursor.fetchone()

    now = datetime.utcnow()

    if exam.get("start_time") and now < exam["start_time"]:
        return jsonify({"error": "Exam not started"}), 403

    if exam.get("end_time") and now > exam["end_time"]:
        return jsonify({"error": "Exam ended"}), 403

    cursor.execute(
        "SELECT start_time FROM results WHERE user_id=%s AND exam_id=%s",
        (user_id, exam_id),
    )
    row = cursor.fetchone()

    start_time = row["start_time"]
    end_time = start_time + timedelta(minutes=exam["duration_minutes"])
    remaining = (end_time - datetime.utcnow()).total_seconds()

    if remaining <= 0:
        submit_exam(user_id, exam_id)
        return jsonify({"error": "Time over"}), 403

    questions = get_questions_by_exam(exam_id)
    answers = get_saved_answers(user_id, exam_id)

    cursor.close()
    conn.close()

    return jsonify({
        "questions": questions,
        "answers": answers,
        "remaining_seconds": int(remaining),
    }), 200
