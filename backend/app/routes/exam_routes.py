from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from backend.app.services.auth_service import get_user_role
from backend.app.services.exam_service import (
    create_exam,
    add_question,
    get_all_exams,
    get_questions_by_exam,
    save_answer,
    submit_exam,
    log_cheat_event,
    start_exam_if_not_started,
    is_exam_time_over,
    get_exam_results,
    get_exam_cheat_logs
)

exam_bp = Blueprint("exam", __name__)

# -------------------- ADMIN APIs --------------------

@exam_bp.route("/create", methods=["POST"])
@jwt_required()
def create_exam_api():
    user_id = int(get_jwt_identity())

    if get_user_role(user_id) != "admin":
        return jsonify({"error": "Admin access required"}), 403

    data = request.json

    create_exam(
        title=data["title"],
        duration_minutes=data["duration_minutes"],
        total_marks=data["total_marks"],
        admin_id=user_id
    )

    return jsonify({"message": "Exam created successfully"}), 201


@exam_bp.route("/add-question", methods=["POST"])
@jwt_required()
def add_question_api():
    user_id = int(get_jwt_identity())

    if get_user_role(user_id) != "admin":
        return jsonify({"error": "Admin access required"}), 403

    data = request.json

    add_question(
        exam_id=data["exam_id"],
        question_text=data["question_text"],
        option_a=data["option_a"],
        option_b=data["option_b"],
        option_c=data["option_c"],
        option_d=data["option_d"],
        correct_option=data["correct_option"]
    )

    return jsonify({"message": "Question added successfully"}), 201


@exam_bp.route("/admin/results/<int:exam_id>", methods=["GET"])
@jwt_required()
def admin_results(exam_id):
    user_id = int(get_jwt_identity())

    if get_user_role(user_id) != "admin":
        return jsonify({"error": "Admin access required"}), 403

    return jsonify(get_exam_results(exam_id)), 200


@exam_bp.route("/admin/cheat-logs/<int:exam_id>", methods=["GET"])
@jwt_required()
def admin_cheat_logs(exam_id):
    user_id = int(get_jwt_identity())

    if get_user_role(user_id) != "admin":
        return jsonify({"error": "Admin access required"}), 403

    return jsonify(get_exam_cheat_logs(exam_id)), 200


# -------------------- STUDENT APIs --------------------

@exam_bp.route("/list", methods=["GET"])
@jwt_required()
def list_exams():
    user_id = int(get_jwt_identity())

    if get_user_role(user_id) != "student":
        return jsonify({"error": "Student access required"}), 403

    return jsonify(get_all_exams()), 200


@exam_bp.route("/questions/<int:exam_id>", methods=["GET"])
@jwt_required()
def get_exam_questions(exam_id):
    user_id = int(get_jwt_identity())

    if get_user_role(user_id) != "student":
        return jsonify({"error": "Student access required"}), 403

    # 🔥 start timer on first access
    start_exam_if_not_started(user_id, exam_id)

    return jsonify(get_questions_by_exam(exam_id)), 200


@exam_bp.route("/save-answer", methods=["POST"])
@jwt_required()
def save_answer_api():
    user_id = int(get_jwt_identity())

    if get_user_role(user_id) != "student":
        return jsonify({"error": "Student access required"}), 403

    data = request.json
    exam_id = data["exam_id"]

    # 🔥 enforce timer
    if is_exam_time_over(user_id, exam_id):
        submit_exam(user_id, exam_id)
        return jsonify({"error": "Time over. Exam auto-submitted"}), 403

    save_answer(
        user_id=user_id,
        exam_id=exam_id,
        question_id=data["question_id"],
        selected_option=data["selected_option"]
    )

    return jsonify({"message": "Answer saved"}), 200


@exam_bp.route("/submit", methods=["POST"])
@jwt_required()
def submit_exam_api():
    user_id = int(get_jwt_identity())

    if get_user_role(user_id) != "student":
        return jsonify({"error": "Student access required"}), 403

    exam_id = request.json["exam_id"]

    score, total = submit_exam(user_id, exam_id)

    return jsonify({
        "message": "Exam submitted",
        "score": score,
        "total_marks": total
    }), 200


@exam_bp.route("/log-cheat", methods=["POST"])
@jwt_required()
def log_cheat_api():
    user_id = int(get_jwt_identity())

    if get_user_role(user_id) != "student":
        return jsonify({"error": "Student access required"}), 403

    data = request.json

    count = log_cheat_event(
        user_id=user_id,
        exam_id=data["exam_id"],
        event_type=data["event_type"]
    )

    # 🔥 auto terminate after 3 violations
    if count >= 3:
        submit_exam(user_id, data["exam_id"])
        return jsonify({
            "message": "Exam auto-terminated due to cheating",
            "terminated": True
        }), 200

    return jsonify({
        "message": "Cheat event logged",
        "warnings": count
    }), 200
