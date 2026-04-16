from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import random

from database import get_db_connection
from app.services.exam_service import (
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
    get_saved_answers,
    get_exam_by_code,
    get_exam_attempt,
    add_ai_generated_question
)
from app.services.ai_service import (
    generate_wrong_options,
    generate_full_exam,
    generate_full_question
)

exam_bp = Blueprint("exam", __name__)


@exam_bp.route("/create", methods=["POST"])
@jwt_required()
def create_exam_api():
    user_id = int(get_jwt_identity())
    data = request.json

    exam_code = create_exam(
        title=data["title"],
        duration_minutes=data["duration_minutes"],
        total_marks=data["total_marks"],
        admin_id=user_id,
        start_time=data.get("start_time"),
        end_time=data.get("end_time")
    )

    return jsonify({"message": "Exam created successfully", "exam_code": exam_code}), 201


@exam_bp.route("/add-question", methods=["POST"])
@jwt_required()
def add_question_api():
    data = request.json

    add_question(
        exam_id=data["exam_id"],
        question_text=data["question_text"],
        option_a=data.get("option_a"),
        option_b=data.get("option_b"),
        option_c=data.get("option_c"),
        option_d=data.get("option_d"),
        correct_option=data["correct_option"],
        question_type=data.get("question_type", "MCQ")
    )

    return jsonify({"message": "Question added successfully"}), 201


@exam_bp.route("/list", methods=["GET"])
@jwt_required()
def list_exams():
    user_id = int(get_jwt_identity())
    exams = get_all_exams(user_id)
    return jsonify(exams), 200


# ------------------------------------------------------------------
# JOIN EXAM
# Fix 1: strip timezone from MySQL datetime before comparing
# Fix 2: do NOT start exam timer here - timer only starts in /questions
# ------------------------------------------------------------------
@exam_bp.route("/join", methods=["POST"])
@jwt_required()
def join_exam():
    user_id = int(get_jwt_identity())
    data = request.json
    exam_code = (data.get("exam_code") or "").strip().upper()

    if not exam_code:
        return jsonify({"error": "exam_code is required"}), 400

    exam = get_exam_by_code(exam_code)
    if not exam:
        return jsonify({"error": "Invalid exam code"}), 404

    now = datetime.now()

    start = exam.get("start_time")
    end   = exam.get("end_time")

    # MySQL returns naive or timezone-aware datetimes depending on connector version.
    # Strip tzinfo so comparison with naive datetime.now() always works.
    if start is not None:
        if hasattr(start, "tzinfo") and start.tzinfo is not None:
            start = start.replace(tzinfo=None)
        if now < start:
            diff = int((start - now).total_seconds() / 60)
            return jsonify({"error": f"Exam has not started yet. Starts in {diff} minute(s)"}), 403

    if end is not None:
        if hasattr(end, "tzinfo") and end.tzinfo is not None:
            end = end.replace(tzinfo=None)
        if now > end:
            return jsonify({"error": "Exam window has closed"}), 403

    attempt = get_exam_attempt(user_id, exam["exam_id"])
    if attempt and attempt["status"] == "SUBMITTED":
        return jsonify({"error": "You have already completed this exam"}), 403

    # Return exam info so frontend can navigate to /exam/:id
    # Timer is NOT started here - it starts only when student loads /questions
    return jsonify({"message": "Exam ready", "exam": exam}), 200


# ------------------------------------------------------------------
# GET EXAM BY CODE (teacher only, no timing check)
# Used by ExamBuilder to load exam without student restrictions.
# ------------------------------------------------------------------
@exam_bp.route("/get-by-code/<string:exam_code>", methods=["GET"])
@jwt_required()
def get_exam_by_code_api(exam_code):
    exam = get_exam_by_code(exam_code.strip().upper())
    if not exam:
        return jsonify({"error": "Exam not found"}), 404
    return jsonify({"exam": exam}), 200


# ------------------------------------------------------------------
# LOAD QUESTIONS
# Fix 3: After shuffling MCQ options, store correct_option as TEXT
# not as label (A/B/C/D). This way submit_exam can compare correctly.
# ------------------------------------------------------------------
@exam_bp.route("/questions/<int:exam_id>", methods=["GET"])
@jwt_required()
def get_exam_questions(exam_id):
    user_id = int(get_jwt_identity())

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Check if already submitted
    cursor.execute("""
        SELECT status FROM results WHERE user_id=%s AND exam_id=%s
    """, (user_id, exam_id))
    result = cursor.fetchone()

    if result and result["status"] in ["SUBMITTED", "TERMINATED"]:
        cursor.close()
        conn.close()
        return jsonify({"error": "Exam already completed"}), 403

    # Start exam timer ONLY when student actually loads questions
    # This prevents timer from starting on a failed join attempt
    session_token = start_exam_if_not_started(user_id, exam_id)

    cursor.execute("SELECT duration_minutes FROM exams WHERE exam_id=%s", (exam_id,))
    exam_row = cursor.fetchone()

    cursor.execute("""
        SELECT start_time FROM results WHERE user_id=%s AND exam_id=%s
    """, (user_id, exam_id))
    updated = cursor.fetchone()

    start_time = updated["start_time"]
    end_time   = start_time + timedelta(minutes=exam_row["duration_minutes"])
    remaining  = (end_time - datetime.now()).total_seconds()

    if remaining <= 0:
        submit_exam(user_id, exam_id)
        cursor.close()
        conn.close()
        return jsonify({"error": "Time over. Exam auto-submitted"}), 403

    questions = get_questions_by_exam(exam_id)
    shuffled  = []

    for q in questions:
        if (q.get("question_type") or "").lower() == "mcq":
            options = [
                ("A", q.get("option_a")),
                ("B", q.get("option_b")),
                ("C", q.get("option_c")),
                ("D", q.get("option_d")),
            ]
            options = [opt for opt in options if opt[1]]

            # Find correct answer TEXT before shuffling
            correct_label = q.get("correct_option")
            correct_text  = None
            for label, text in options:
                if label == correct_label:
                    correct_text = text
                    break

            random.shuffle(options)

            new_options = {}
            for i, (_, text) in enumerate(options):
                new_label = ["A", "B", "C", "D"][i]
                new_options[f"option_{new_label.lower()}"] = text

            q.update(new_options)

            # IMPORTANT: store correct_option as TEXT not label
            # submit_exam compares selected_option (text) with correct_option
            # so both must be text for comparison to work
            q["correct_option"] = correct_text

        shuffled.append(q)

    random.shuffle(shuffled)

    answers = get_saved_answers(user_id, exam_id)

    cursor.close()
    conn.close()

    return jsonify({
        "questions":        shuffled,
        "answers":          answers,
        "remaining_seconds": int(remaining),
        "session_token":    session_token
    }), 200


@exam_bp.route("/save-answer", methods=["POST"])
@jwt_required()
def save_answer_api():
    user_id = int(get_jwt_identity())
    data    = request.json

    if is_exam_time_over(user_id, data["exam_id"]):
        submit_exam(user_id, data["exam_id"])
        return jsonify({"error": "Time over. Exam auto-submitted"}), 403

    save_answer(
        user_id=user_id,
        exam_id=data["exam_id"],
        question_id=data["question_id"],
        selected_option=data.get("selected_option"),
        text_answer=data.get("text_answer")
    )

    return jsonify({"message": "Answer saved"}), 200


@exam_bp.route("/submit", methods=["POST"])
@jwt_required()
def submit_exam_api():
    user_id = int(get_jwt_identity())
    exam_id = request.json["exam_id"]

    score, total = submit_exam(user_id, exam_id)

    return jsonify({"message": "Exam submitted", "score": score, "total_marks": total}), 200


@exam_bp.route("/log-cheat", methods=["POST"])
@jwt_required()
def log_cheat_api():
    user_id    = int(get_jwt_identity())
    data       = request.json
    exam_id    = data.get("exam_id")
    event_type = data.get("event_type")

    if not exam_id or not event_type:
        return jsonify({"error": "Missing data"}), 400

    try:
        count = log_cheat_event(user_id, exam_id, event_type)
        if count >= 3:
            submit_exam(user_id, exam_id)
            return jsonify({"message": "Auto-submitted due to cheating", "terminated": True}), 200
        return jsonify({"message": "Cheat logged", "warnings": count}), 200
    except Exception as e:
        print("Cheat log error:", str(e))
        return jsonify({"error": "Failed to log cheat"}), 500


@exam_bp.route("/ai-generate-options", methods=["POST"])
@jwt_required()
def ai_generate_options_api():
    data = request.json
    if not data.get("question") or not data.get("correct_answer"):
        return jsonify({"error": "Missing question or correct_answer"}), 400
    try:
        wrong_options = generate_wrong_options(data["question"], data["correct_answer"])
        return jsonify({"wrong_options": wrong_options}), 200
    except Exception as e:
        return jsonify({"error": "AI generation failed", "details": str(e)}), 500


@exam_bp.route("/ai-generate-question", methods=["POST"])
@jwt_required()
def ai_generate_question():
    data  = request.json
    topic = (data.get("topic") or "").strip()
    if not topic:
        return jsonify({"error": "Topic required"}), 400
    try:
        return jsonify(generate_full_question(topic)), 200
    except Exception as e:
        return jsonify({"error": "AI failed", "details": str(e)}), 500


@exam_bp.route("/ai-generate-full-exam", methods=["POST"])
@jwt_required()
def ai_generate_full_exam_api():
    data = request.json
    if not all(field in data for field in ["subject", "topic", "difficulty", "count"]):
        return jsonify({"error": "Missing required fields"}), 400
    try:
        questions = generate_full_exam(
            subject=data["subject"], topic=data["topic"],
            difficulty=data["difficulty"], count=data["count"]
        )
        return jsonify({"questions": questions}), 200
    except Exception as e:
        return jsonify({"error": "AI full exam generation failed", "details": str(e)}), 500


@exam_bp.route("/results/<int:exam_id>", methods=["GET"])
@jwt_required()
def get_results_api(exam_id):
    try:
        results = get_exam_results(exam_id)
        return jsonify(results), 200
    except Exception as e:
        print("Results error:", str(e))
        return jsonify({"error": str(e)}), 500


@exam_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    user_id = int(get_jwt_identity())
    conn    = get_db_connection()
    cursor  = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users WHERE user_id=%s", (user_id,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404

        cursor.execute("SELECT COUNT(*) as created FROM exams WHERE created_by=%s", (user_id,))
        created = cursor.fetchone()["created"]

        cursor.execute("SELECT COUNT(*) as attempted FROM results WHERE user_id=%s", (user_id,))
        attempted = cursor.fetchone()["attempted"]

        return jsonify({
            "user":     {"name": user.get("name"), "email": user.get("email")},
            "created":  created,
            "attempted": attempted
        })
    except Exception as e:
        print("Profile error:", str(e))
        return jsonify({"error": "Failed to load profile"}), 500
    finally:
        cursor.close()
        conn.close()


@exam_bp.route("/analytics/<int:exam_id>", methods=["GET"])
@jwt_required()
def get_exam_analytics(exam_id):
    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT COUNT(*) as total_students, AVG(score) as avg_score, MAX(score) as highest_score
        FROM results WHERE exam_id=%s
    """, (exam_id,))
    stats = cursor.fetchone()
    cursor.execute("SELECT COUNT(*) as total_cheats FROM cheat_logs WHERE exam_id=%s", (exam_id,))
    cheats = cursor.fetchone()["total_cheats"]
    cursor.close()
    conn.close()
    return jsonify({"stats": stats, "cheats": cheats})


@exam_bp.route("/answers/<int:exam_id>", methods=["GET"])
@jwt_required()
def get_answers_api(exam_id):
    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT u.user_id, u.name, q.question_id, q.question_text, a.text_answer
        FROM answers a
        JOIN questions q ON a.question_id = q.question_id
        JOIN users u ON a.user_id = u.user_id
        WHERE a.exam_id=%s AND LOWER(q.question_type) = 'descriptive'
        ORDER BY u.user_id
    """, (exam_id,))
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(data), 200


@exam_bp.route("/evaluate", methods=["POST"])
@jwt_required()
def evaluate_api():
    data        = request.json
    user_id     = data.get("user_id")
    exam_id     = data.get("exam_id")
    question_id = data.get("question_id")
    marks       = float(data.get("marks", 0))

    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT total_marks FROM exams WHERE exam_id=%s", (exam_id,))
    total_marks = cursor.fetchone()["total_marks"]

    cursor.execute("SELECT COUNT(*) as total_q FROM questions WHERE exam_id=%s", (exam_id,))
    total_q = cursor.fetchone()["total_q"]
    marks_per_q = round(total_marks / total_q, 4) if total_q else 0

    if marks > marks_per_q:
        cursor.close()
        conn.close()
        return jsonify({"error": f"Max allowed {round(marks_per_q, 2)}"}), 400

    cursor.execute("""
        UPDATE answers SET marks=%s WHERE user_id=%s AND exam_id=%s AND question_id=%s
    """, (marks, user_id, exam_id, question_id))

    # Recalculate total score after manual evaluation
    # selected_option is TEXT, correct_option is also TEXT (stored as text in answers)
    cursor.execute("""
        SELECT q.question_type, q.correct_option, a.selected_option, a.marks as manual_marks
        FROM questions q
        LEFT JOIN answers a ON q.question_id = a.question_id
            AND a.user_id=%s AND a.exam_id=%s
        WHERE q.exam_id=%s
    """, (user_id, exam_id, exam_id))

    all_q       = cursor.fetchall()
    total_score = 0.0

    for q in all_q:
        if (q["question_type"] or "").lower() == "mcq":
            if q["selected_option"] and q["selected_option"] == q["correct_option"]:
                total_score += marks_per_q
        else:
            total_score += float(q.get("manual_marks") or 0)

    cursor.execute("""
        SELECT COUNT(*) as pending FROM questions q
        LEFT JOIN answers a ON q.question_id = a.question_id AND a.user_id=%s AND a.exam_id=%s
        WHERE q.exam_id=%s AND LOWER(q.question_type)='descriptive'
        AND (a.marks IS NULL OR a.marks=0)
    """, (user_id, exam_id, exam_id))
    pending     = cursor.fetchone()["pending"]
    eval_status = "PENDING" if pending > 0 else "FINAL"

    cursor.execute("""
        UPDATE results SET score=%s, evaluation_status=%s WHERE user_id=%s AND exam_id=%s
    """, (round(total_score, 2), eval_status, user_id, exam_id))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({
        "message":           "Marks updated",
        "current_score":     round(total_score, 2),
        "total_marks":       total_marks,
        "evaluation_status": eval_status
    }), 200
