from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.app.services.ai_service import generate_wrong_options
from backend.app.services.exam_service import add_ai_generated_question
from backend.app.services.exam_service import add_full_ai_exam
from backend.database import get_db_connection
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

    question_type = data.get("question_type", "MCQ")

    add_question(
        exam_id=data["exam_id"],
        question_text=data["question_text"],
        option_a=data.get("option_a"),
        option_b=data.get("option_b"),
        option_c=data.get("option_c"),
        option_d=data.get("option_d"),
        correct_option=data["correct_option"],
        question_type=question_type
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

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT status, start_time FROM results
        WHERE user_id=%s AND exam_id=%s
    """, (user_id, exam_id))

    result = cursor.fetchone()

    if result and result["status"] in ["SUBMITTED", "TERMINATED"]:
        cursor.close()
        conn.close()
        return jsonify({"error": "Exam already completed"}), 403

    # Start exam if not started
    start_exam_if_not_started(user_id, exam_id)

    # Get exam duration
    cursor.execute("""
        SELECT duration_minutes FROM exams
        WHERE exam_id=%s
    """, (exam_id,))
    exam = cursor.fetchone()

    # Get updated start_time
    cursor.execute("""
        SELECT start_time FROM results
        WHERE user_id=%s AND exam_id=%s
    """, (user_id, exam_id))
    updated = cursor.fetchone()

    from datetime import datetime, timedelta

    start_time = updated["start_time"]
    duration = timedelta(minutes=exam["duration_minutes"])
    end_time = start_time + duration

    remaining = (end_time - datetime.now()).total_seconds()

    if remaining <= 0:
        submit_exam(user_id, exam_id)
        cursor.close()
        conn.close()
        return jsonify({"error": "Time over. Exam auto-submitted"}), 403

    questions = get_questions_by_exam(exam_id)

    cursor.close()
    conn.close()

    return jsonify({
        "questions": questions,
        "remaining_seconds": int(remaining)
    }), 200


@exam_bp.route("/save-answer", methods=["POST"])
@jwt_required()
def save_answer_api():
    user_id = int(get_jwt_identity())

    if get_user_role(user_id) != "student":
        return jsonify({"error": "Student access required"}), 403

    data = request.json
    exam_id = data["exam_id"]
    question_id = data["question_id"]

    # Timer check
    if is_exam_time_over(user_id, exam_id):
        submit_exam(user_id, exam_id)
        return jsonify({"error": "Time over. Exam auto-submitted"}), 403

    save_answer(
        user_id=user_id,
        exam_id=exam_id,
        question_id=question_id,
        selected_option=data.get("selected_option"),
        text_answer=data.get("text_answer")
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


#ai file

@exam_bp.route("/admin/ai-generate-options", methods=["POST"])
@jwt_required()
def ai_generate_options_api():
    user_id = int(get_jwt_identity())

    if get_user_role(user_id) != "admin":
        return jsonify({"error": "Admin access required"}), 403

    data = request.json

    if not data.get("question") or not data.get("correct_answer"):
        return jsonify({"error": "Missing question or correct_answer"}), 400

    try:
        wrong_options = generate_wrong_options(
            question=data["question"],
            correct_answer=data["correct_answer"]
        )

        return jsonify({
            "correct_answer": data["correct_answer"],
            "wrong_options": wrong_options
        }), 200

    except Exception as e:
        return jsonify({
            "error": "AI generation failed",
            "details": str(e)
        }), 500
    


    # new ai route 
@exam_bp.route("/admin/ai-add-question", methods=["POST"])
@jwt_required()
def ai_add_question_api():
    user_id = int(get_jwt_identity())

    if get_user_role(user_id) != "admin":
        return jsonify({"error": "Admin access required"}), 403

    data = request.json

    required_fields = ["exam_id", "question_text", "correct_answer"]

    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        result = add_ai_generated_question(
            exam_id=data["exam_id"],
            question_text=data["question_text"],
            correct_answer=data["correct_answer"]
        )

        return jsonify({
            "message": "AI question generated and saved",
            "data": result
        }), 201

    except Exception as e:
        return jsonify({
            "error": "AI question creation failed",
            "details": str(e)
        }), 500
    

#full exam 
@exam_bp.route("/admin/ai-generate-full-exam", methods=["POST"])
@jwt_required()
def ai_generate_full_exam_api():
    user_id = int(get_jwt_identity())

    if get_user_role(user_id) != "admin":
        return jsonify({"error": "Admin access required"}), 403

    data = request.json

    required = ["exam_id", "subject", "topic", "difficulty", "count"]

    if not all(field in data for field in required):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        inserted = add_full_ai_exam(
            exam_id=data["exam_id"],
            subject=data["subject"],
            topic=data["topic"],
            difficulty=data["difficulty"],
            count=data["count"]
        )

        return jsonify({
            "message": "AI full exam generated successfully",
            "questions_added": inserted
        }), 201

    except Exception as e:
        return jsonify({
            "error": "AI full exam generation failed",
            "details": str(e)
        }), 500