from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
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
)
from app.services.ai_service import (
    generate_wrong_options,
    generate_full_exam,
    generate_full_question,
)

exam_bp = Blueprint("exam", __name__)


# ------------------------------------------------------------------
# CREATE EXAM
# This only creates the exam shell (title, duration, marks, timing).
# Questions are added separately via /add-question.
# ------------------------------------------------------------------
@exam_bp.route("/create", methods=["POST"])
@jwt_required()
def create_exam_api():
    user_id = int(get_jwt_identity())
    data = request.json

    if not data.get("title"):
        return jsonify({"error": "Title is required"}), 400

    exam_code = create_exam(
        title=data["title"],
        duration_minutes=int(data.get("duration_minutes", 30)),
        total_marks=int(data.get("total_marks", 10)),
        admin_id=user_id,
        start_time=data.get("start_time"),
        end_time=data.get("end_time"),
    )

    return jsonify({"message": "Exam created", "exam_code": exam_code}), 201


# ------------------------------------------------------------------
# ADD QUESTION TO EXAM
# Called once per question from ExamBuilder after user clicks Save All.
# ------------------------------------------------------------------
@exam_bp.route("/add-question", methods=["POST"])
@jwt_required()
def add_question_api():
    data = request.json

    if not data.get("exam_id") or not data.get("question_text"):
        return jsonify({"error": "exam_id and question_text are required"}), 400

    add_question(
        exam_id=data["exam_id"],
        question_text=data["question_text"],
        option_a=data.get("option_a"),
        option_b=data.get("option_b"),
        option_c=data.get("option_c"),
        option_d=data.get("option_d"),
        correct_option=data.get("correct_option"),
        question_type=data.get("question_type", "MCQ"),
    )

    return jsonify({"message": "Question added"}), 201


# ------------------------------------------------------------------
# LIST EXAMS FOR LOGGED-IN USER (teacher dashboard)
# ------------------------------------------------------------------
@exam_bp.route("/list", methods=["GET"])
@jwt_required()
def list_exams():
    user_id = int(get_jwt_identity())
    exams = get_all_exams(user_id)
    return jsonify(exams), 200


# ------------------------------------------------------------------
# JOIN EXAM
# Validates exam code, checks timing window, checks if already done.
# Returns exam metadata so frontend can navigate to /exam/:id
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
    end = exam.get("end_time")

    if start and now < start:
        return jsonify({"error": "Exam has not started yet"}), 403
    if end and now > end:
        return jsonify({"error": "Exam window has closed"}), 403

    attempt = get_exam_attempt(user_id, exam["exam_id"])
    if attempt and attempt["status"] == "SUBMITTED":
        return jsonify({"error": "You have already completed this exam"}), 403

    return jsonify({"message": "Exam ready", "exam": exam}), 200


# ------------------------------------------------------------------
# LOAD QUESTIONS FOR STUDENT
# Starts the exam timer on first load.
# Shuffles MCQ options each time so answers cannot be memorised.
# Returns saved answers so student can resume if page refreshes.
# ------------------------------------------------------------------
@exam_bp.route("/questions/<int:exam_id>", methods=["GET"])
@jwt_required()
def get_exam_questions(exam_id):
    user_id = int(get_jwt_identity())

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Check if exam already submitted or terminated
    cursor.execute(
        "SELECT status, start_time FROM results WHERE user_id=%s AND exam_id=%s",
        (user_id, exam_id),
    )
    result = cursor.fetchone()

    if result and result["status"] in ("SUBMITTED", "TERMINATED"):
        cursor.close()
        conn.close()
        return jsonify({"error": "Exam already completed"}), 403

    # Start exam session if this is the first load
    session_token = start_exam_if_not_started(user_id, exam_id)

    # Fetch exam duration
    cursor.execute("SELECT duration_minutes FROM exams WHERE exam_id=%s", (exam_id,))
    exam = cursor.fetchone()

    # Fetch updated start time
    cursor.execute(
        "SELECT start_time FROM results WHERE user_id=%s AND exam_id=%s",
        (user_id, exam_id),
    )
    row = cursor.fetchone()

    from datetime import timedelta
    start_time = row["start_time"]
    end_time = start_time + timedelta(minutes=exam["duration_minutes"])
    remaining = (end_time - datetime.now()).total_seconds()

    if remaining <= 0:
        submit_exam(user_id, exam_id)
        cursor.close()
        conn.close()
        return jsonify({"error": "Time over. Exam auto-submitted"}), 403

    # Fetch and shuffle questions
    questions = get_questions_by_exam(exam_id)
    shuffled = []

    for q in questions:
        if (q.get("question_type") or "").lower() == "mcq":
            options = [
                ("A", q.get("option_a")),
                ("B", q.get("option_b")),
                ("C", q.get("option_c")),
                ("D", q.get("option_d")),
            ]
            # Remove empty options
            options = [(label, text) for label, text in options if text]

            # Find the correct answer text before shuffling
            correct_label = q.get("correct_option")
            correct_text = next(
                (text for label, text in options if label == correct_label), None
            )

            random.shuffle(options)

            new_opts = {}
            new_correct = None
            for i, (_, text) in enumerate(options):
                new_label = ["A", "B", "C", "D"][i]
                new_opts[f"option_{new_label.lower()}"] = text
                if text == correct_text:
                    new_correct = new_label

            q.update(new_opts)
            q["correct_option"] = new_correct

        shuffled.append(q)

    random.shuffle(shuffled)

    # Fetch previously saved answers so student can resume
    answers = get_saved_answers(user_id, exam_id)

    cursor.close()
    conn.close()

    return jsonify({
        "questions": shuffled,
        "answers": answers,
        "remaining_seconds": int(remaining),
        "session_token": session_token,
    }), 200


# ------------------------------------------------------------------
# SAVE ANSWER (called on every option click or text change)
# ------------------------------------------------------------------
@exam_bp.route("/save-answer", methods=["POST"])
@jwt_required()
def save_answer_api():
    user_id = int(get_jwt_identity())
    data = request.json

    if is_exam_time_over(user_id, data["exam_id"]):
        submit_exam(user_id, data["exam_id"])
        return jsonify({"error": "Time over. Exam auto-submitted"}), 403

    save_answer(
        user_id=user_id,
        exam_id=data["exam_id"],
        question_id=data["question_id"],
        selected_option=data.get("selected_option"),
        text_answer=data.get("text_answer"),
    )

    return jsonify({"message": "Answer saved"}), 200


# ------------------------------------------------------------------
# SUBMIT EXAM (manual or auto on timeout / cheat limit)
# ------------------------------------------------------------------
@exam_bp.route("/submit", methods=["POST"])
@jwt_required()
def submit_exam_api():
    user_id = int(get_jwt_identity())
    exam_id = request.json.get("exam_id")

    if not exam_id:
        return jsonify({"error": "exam_id required"}), 400

    score, total = submit_exam(user_id, exam_id)

    return jsonify({
        "message": "Exam submitted",
        "score": score,
        "total_marks": total,
    }), 200


# ------------------------------------------------------------------
# LOG CHEAT EVENT
# Tracks tab switches. Auto-submits after 3 violations.
# ------------------------------------------------------------------
@exam_bp.route("/log-cheat", methods=["POST"])
@jwt_required()
def log_cheat_api():
    user_id = int(get_jwt_identity())
    data = request.json
    exam_id = data.get("exam_id")
    event_type = data.get("event_type")

    if not exam_id or not event_type:
        return jsonify({"error": "exam_id and event_type required"}), 400

    try:
        count = log_cheat_event(user_id, exam_id, event_type)

        if count >= 3:
            submit_exam(user_id, exam_id)
            return jsonify({"message": "Auto-submitted due to cheating", "terminated": True}), 200

        return jsonify({"message": "Cheat event logged", "warnings": count}), 200

    except Exception as e:
        print("Cheat log error:", str(e))
        return jsonify({"error": "Failed to log cheat event"}), 500


# ------------------------------------------------------------------
# AI - GENERATE WRONG OPTIONS for a given question and correct answer
# ------------------------------------------------------------------
@exam_bp.route("/ai-generate-options", methods=["POST"])
@jwt_required()
def ai_generate_options_api():
    data = request.json

    if not data.get("question") or not data.get("correct_answer"):
        return jsonify({"error": "question and correct_answer are required"}), 400

    try:
        wrong_options = generate_wrong_options(
            question=data["question"],
            correct_answer=data["correct_answer"],
        )
        return jsonify({"wrong_options": wrong_options}), 200

    except Exception as e:
        return jsonify({"error": "AI generation failed", "details": str(e)}), 500


# ------------------------------------------------------------------
# AI - GENERATE A SINGLE FULL QUESTION (with options) for a topic
# ------------------------------------------------------------------
@exam_bp.route("/ai-generate-question", methods=["POST"])
@jwt_required()
def ai_generate_question():
    data = request.json
    topic = data.get("topic", "").strip()

    if not topic:
        return jsonify({"error": "topic is required"}), 400

    try:
        result = generate_full_question(topic)
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": "AI generation failed", "details": str(e)}), 500


# ------------------------------------------------------------------
# AI - GENERATE A FULL EXAM (multiple questions) for a subject/topic
# ------------------------------------------------------------------
@exam_bp.route("/ai-generate-full-exam", methods=["POST"])
@jwt_required()
def ai_generate_full_exam_api():
    data = request.json
    required = ["subject", "topic", "difficulty", "count"]

    if not all(data.get(f) for f in required):
        return jsonify({"error": "subject, topic, difficulty, and count are required"}), 400

    try:
        questions = generate_full_exam(
            subject=data["subject"],
            topic=data["topic"],
            difficulty=data["difficulty"],
            count=data["count"],
        )
        return jsonify({"questions": questions}), 200

    except Exception as e:
        return jsonify({"error": "AI exam generation failed", "details": str(e)}), 500


# ------------------------------------------------------------------
# GET EXAM RESULTS (teacher view)
# Shows all students who attempted, their scores, cheat count.
# ------------------------------------------------------------------
@exam_bp.route("/results/<int:exam_id>", methods=["GET"])
@jwt_required()
def get_results_api(exam_id):
    try:
        results = get_exam_results(exam_id)
        return jsonify(results), 200
    except Exception as e:
        print("Results error:", str(e))
        return jsonify({"error": str(e)}), 500


# ------------------------------------------------------------------
# GET PROFILE (name, email, exams created, exams attempted)
# ------------------------------------------------------------------
@exam_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    user_id = int(get_jwt_identity())
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM users WHERE user_id=%s", (user_id,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "User not found"}), 404

        cursor.execute(
            "SELECT COUNT(*) as total FROM exams WHERE created_by=%s", (user_id,)
        )
        created = cursor.fetchone()["total"]

        cursor.execute(
            "SELECT COUNT(*) as total FROM results WHERE user_id=%s", (user_id,)
        )
        attempted = cursor.fetchone()["total"]

        return jsonify({
            "user": {"name": user.get("name"), "email": user.get("email")},
            "created": created,
            "attempted": attempted,
        })

    except Exception as e:
        print("Profile error:", str(e))
        return jsonify({"error": "Failed to load profile"}), 500

    finally:
        cursor.close()
        conn.close()


# ------------------------------------------------------------------
# GET ANALYTICS for a specific exam
# ------------------------------------------------------------------
@exam_bp.route("/analytics/<int:exam_id>", methods=["GET"])
@jwt_required()
def get_exam_analytics(exam_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            COUNT(*) as total_students,
            AVG(score) as avg_score,
            MAX(score) as highest_score
        FROM results
        WHERE exam_id=%s
    """, (exam_id,))
    stats = cursor.fetchone()

    cursor.execute(
        "SELECT COUNT(*) as total FROM cheat_logs WHERE exam_id=%s", (exam_id,)
    )
    cheats = cursor.fetchone()["total"]

    cursor.close()
    conn.close()

    return jsonify({"stats": stats, "cheats": cheats})


# ------------------------------------------------------------------
# GET DESCRIPTIVE ANSWERS for manual evaluation
# Returns only descriptive-type answers for a given exam.
# ------------------------------------------------------------------
@exam_bp.route("/answers/<int:exam_id>", methods=["GET"])
@jwt_required()
def get_answers_api(exam_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            u.user_id,
            u.name,
            q.question_id,
            q.question_text,
            a.text_answer
        FROM answers a
        JOIN questions q ON a.question_id = q.question_id
        JOIN users u ON a.user_id = u.user_id
        WHERE a.exam_id = %s
          AND LOWER(q.question_type) = 'descriptive'
        ORDER BY u.user_id
    """, (exam_id,))

    data = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify(data), 200


# ------------------------------------------------------------------
# EVALUATE DESCRIPTIVE ANSWER (teacher assigns marks manually)
# After saving marks, recalculates the student total score:
#   - MCQ marks = auto (correct option match * marks_per_question)
#   - Descriptive marks = manually assigned here
# If all descriptive questions are evaluated, status becomes FINAL.
# ------------------------------------------------------------------
@exam_bp.route("/evaluate", methods=["POST"])
@jwt_required()
def evaluate_api():
    data = request.json
    user_id = data.get("user_id")
    exam_id = data.get("exam_id")
    question_id = data.get("question_id")
    marks = float(data.get("marks", 0))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Each question gets an equal share of total marks regardless of type
    cursor.execute("SELECT total_marks FROM exams WHERE exam_id=%s", (exam_id,))
    total_marks = cursor.fetchone()["total_marks"]

    cursor.execute(
        "SELECT COUNT(*) as total_q FROM questions WHERE exam_id=%s", (exam_id,)
    )
    total_q = cursor.fetchone()["total_q"]

    marks_per_q = round(total_marks / total_q, 4) if total_q else 0

    if marks > marks_per_q:
        cursor.close()
        conn.close()
        return jsonify({"error": f"Max allowed per question is {round(marks_per_q, 2)}"}), 400

    # Save the manually assigned marks for this descriptive answer
    cursor.execute("""
        UPDATE answers
        SET marks = %s
        WHERE user_id = %s AND exam_id = %s AND question_id = %s
    """, (marks, user_id, exam_id, question_id))

    # Recalculate total score for this student
    # MCQ: correct answer match gets marks_per_q
    # Descriptive: uses the manually saved marks value
    cursor.execute("""
        SELECT
            q.question_type,
            q.correct_option,
            a.selected_option,
            a.marks as manual_marks
        FROM questions q
        LEFT JOIN answers a
            ON q.question_id = a.question_id
           AND a.user_id = %s
           AND a.exam_id = %s
        WHERE q.exam_id = %s
    """, (user_id, exam_id, exam_id))

    all_questions = cursor.fetchall()
    total_score = 0.0

    for q in all_questions:
        q_type = (q["question_type"] or "").lower()
        if q_type == "mcq":
            if q["selected_option"] and q["selected_option"] == q["correct_option"]:
                total_score += marks_per_q
        else:
            total_score += float(q.get("manual_marks") or 0)

    # Check if any descriptive questions still have no marks assigned
    cursor.execute("""
        SELECT COUNT(*) as pending
        FROM questions q
        LEFT JOIN answers a
            ON q.question_id = a.question_id
           AND a.user_id = %s
           AND a.exam_id = %s
        WHERE q.exam_id = %s
          AND LOWER(q.question_type) = 'descriptive'
          AND (a.marks IS NULL OR a.marks = 0)
    """, (user_id, exam_id, exam_id))

    pending = cursor.fetchone()["pending"]
    eval_status = "PENDING" if pending > 0 else "FINAL"

    cursor.execute("""
        UPDATE results
        SET score = %s, evaluation_status = %s
        WHERE user_id = %s AND exam_id = %s
    """, (round(total_score, 2), eval_status, user_id, exam_id))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({
        "message": "Marks saved successfully",
        "current_score": round(total_score, 2),
        "total_marks": total_marks,
        "evaluation_status": eval_status,
    }), 200
