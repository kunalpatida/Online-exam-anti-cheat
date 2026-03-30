from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

# Services
from backend.database import get_db_connection
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
    get_saved_answers,
    get_exam_by_code,
    get_exam_attempt,
    add_ai_generated_question
)

# AI Services
from backend.app.services.ai_service import (
    generate_wrong_options,
    generate_full_exam,
    generate_full_question
)

exam_bp = Blueprint("exam", __name__)


# ==========================================================
# EXAM CREATION
# ==========================================================

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

    return jsonify({
        "message": "Exam created successfully",
        "exam_code": exam_code
    }), 201


# ==========================================================
# ADD QUESTION
# ==========================================================

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


# ==========================================================
# GET USER EXAMS
# ==========================================================

@exam_bp.route("/list", methods=["GET"])
@jwt_required()
def list_exams():

    user_id = int(get_jwt_identity())
    exams = get_all_exams(user_id)

    return jsonify(exams), 200


# ==========================================================
# JOIN EXAM
# ==========================================================

@exam_bp.route("/join", methods=["POST"])
@jwt_required()
def join_exam():

    user_id = int(get_jwt_identity())
    data = request.json

    exam_code = data.get("exam_code")

    if not exam_code:
        return jsonify({"error": "exam_code is required"}), 400

    exam = get_exam_by_code(exam_code)

    if not exam:
        return jsonify({"error": "Invalid exam code"}), 404

    from datetime import datetime

    start = exam.get("start_time")
    end = exam.get("end_time")
    now = datetime.now()

    if start and now < start:
        return jsonify({"error": "Exam has not started yet"}), 403

    if end and now > end:
        return jsonify({"error": "Exam window has closed"}), 403

    attempt = get_exam_attempt(user_id, exam["exam_id"])

    if attempt and attempt["status"] == "SUBMITTED":
        return jsonify({"error": "You have already completed this exam"}), 403

    return jsonify({
        "message": "Exam ready",
        "exam": exam
    }), 200


# ==========================================================
# LOAD QUESTIONS
# ==========================================================
import random

@exam_bp.route("/questions/<int:exam_id>", methods=["GET"])
@jwt_required()
def get_exam_questions(exam_id):

    user_id = int(get_jwt_identity())

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

    session_token = start_exam_if_not_started(user_id, exam_id)

    cursor.execute("""
        SELECT duration_minutes FROM exams WHERE exam_id=%s
    """, (exam_id,))
    exam = cursor.fetchone()

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

    # ==========================================
    # FETCH QUESTIONS
    # ==========================================
    questions = get_questions_by_exam(exam_id)

    # ==========================================
    # SHUFFLE LOGIC (IMPORTANT)
    # ==========================================
    shuffled_questions = []

    for q in questions:

        # Only shuffle MCQ
        if (q.get("question_type") or "").lower() == "mcq":

            options = [
                ("A", q.get("option_a")),
                ("B", q.get("option_b")),
                ("C", q.get("option_c")),
                ("D", q.get("option_d"))
            ]

            # Remove empty options (safety)
            options = [opt for opt in options if opt[1]]
             
             #step 1:
            correct_label = q.get("correct_option")
            correct_text = None

            for label, text in options:
                if label == correct_label:
                    correct_text = text
                    break

            # step 2: Shuffle options
            random.shuffle(options)

            # step 3: rebuild mapping   
            
            labels = ["A","B","C","D"]
            new_options = {}
            new_correct = None
            

            for i, (_, text) in enumerate(options):
                new_label = labels[i]
                new_options[f"option_{new_label.lower()}"] = text

                if text == correct_text:
                    new_correct = new_label

            # Update question with shuffled options
            q.update(new_options)
            q["correct_option"] = new_correct

        shuffled_questions.append(q)

    # Shuffle question order
    random.shuffle(shuffled_questions)

    questions = shuffled_questions

    # ==========================================
    # FETCH SAVED ANSWERS
    # ==========================================
    answers = get_saved_answers(user_id, exam_id)

    cursor.close()
    conn.close()

    return jsonify({
        "questions": questions,
        "answers": answers,
        "remaining_seconds": int(remaining),
        "session_token": session_token
    }), 200


# ==========================================================
# SAVE ANSWER
# ==========================================================

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
        text_answer=data.get("text_answer")
    )

    return jsonify({"message": "Answer saved"}), 200


# ==========================================================
# SUBMIT EXAM
# ==========================================================

@exam_bp.route("/submit", methods=["POST"])
@jwt_required()
def submit_exam_api():

    user_id = int(get_jwt_identity())
    exam_id = request.json["exam_id"]

    score, total = submit_exam(user_id, exam_id)

    return jsonify({
        "message": "Exam submitted",
        "score": score,
        "total_marks": total
    }), 200


# ==========================================================
# CHEAT DETECTION
# ==========================================================

@exam_bp.route("/log-cheat", methods=["POST"])
@jwt_required()
def log_cheat_api():

    user_id = int(get_jwt_identity())
    data = request.json

    # Correct extraction
    exam_id = data.get("exam_id")
    event_type = data.get("event_type")

    if not exam_id or not event_type:
        return jsonify({"error": "Missing data"}), 400

    try:
        count = log_cheat_event(user_id, exam_id, event_type)

        if count >= 3:
            submit_exam(user_id, exam_id)
            return jsonify({
                "message": "Exam auto-submitted due to cheating",
                "terminated": True
            }), 200

        return jsonify({
            "message": "Cheat logged",
            "warnings": count
        }), 200

    except Exception as e:
        print("CHEAT LOG ERROR:", str(e))
        return jsonify({"error": "Failed to log cheat"}), 500
    

# ==========================================================
# AI FEATURES
# ==========================================================

@exam_bp.route("/ai-generate-options", methods=["POST"])
@jwt_required()
def ai_generate_options_api():

    data = request.json

    if not data.get("question") or not data.get("correct_answer"):
        return jsonify({"error": "Missing question or correct_answer"}), 400

    try:
        wrong_options = generate_wrong_options(
            question=data["question"],
            correct_answer=data["correct_answer"]
        )

        return jsonify({"wrong_options": wrong_options}), 200

    except Exception as e:
        return jsonify({
            "error": "AI generation failed",
            "details": str(e)
        }), 500


@exam_bp.route("/ai-generate-question", methods=["POST"])
@jwt_required()
def ai_generate_question():

    data = request.json
    topic = data.get("topic")

    if not topic:
        return jsonify({"error": "Topic required"}), 400

    try:
        result = generate_full_question(topic)
        return jsonify(result), 200

    except Exception as e:
        return jsonify({
            "error": "AI failed",
            "details": str(e)
        }), 500


@exam_bp.route("/ai-generate-full-exam", methods=["POST"])
@jwt_required()
def ai_generate_full_exam_api():

    data = request.json

    required = ["subject", "topic", "difficulty", "count"]

    if not all(field in data for field in required):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        questions = generate_full_exam(
            subject=data["subject"],
            topic=data["topic"],
            difficulty=data["difficulty"],
            count=data["count"]
        )

        return jsonify({"questions": questions}), 200

    except Exception as e:
        return jsonify({
            "error": "AI full exam generation failed",
            "details": str(e)
        }), 500
    

# ==========================================================
# RESULT PAGE
# ==========================================================   
@exam_bp.route("/results/<int:exam_id>", methods=["GET"])
@jwt_required()
def get_results_api(exam_id):

    print("HIT RESULTS ROUTE:", exam_id)  # 👈 ADD

    try:
        results = get_exam_results(exam_id)

        print("RESULT DATA:", results)    # 👈 ADD

        return jsonify(results), 200

    except Exception as e:
        print("ERROR IN RESULTS:", str(e))  # 👈 ADD
        return jsonify({"error": str(e)}), 500
    

    
# ==========================================================
# Profile 
# ==========================================================   

@exam_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():

    user_id = int(get_jwt_identity())

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # user
        cursor.execute("SELECT * FROM users WHERE user_id=%s", (user_id,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "User not found"}), 404

        name = user.get("name") or "User"
        email = user.get("email")

        # 🔥 FIXED HERE
        cursor.execute(
            "SELECT COUNT(*) as created FROM exams WHERE created_by=%s",
            (user_id,)
        )
        created = cursor.fetchone()["created"]

        # attempted
        cursor.execute(
            "SELECT COUNT(*) as attempted FROM results WHERE user_id=%s",
            (user_id,)
        )
        attempted = cursor.fetchone()["attempted"]

        return jsonify({
            "user": {
                "name": name,
                "email": email
            },
            "created": created,
            "attempted": attempted
        })

    except Exception as e:
        print("PROFILE ERROR:", str(e))
        return jsonify({"error": "Failed to load profile"}), 500

    finally:
        cursor.close()
        conn.close()

    
# ==========================================================
# Analytics page
# ==========================================================   
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

    cursor.execute("""
        SELECT COUNT(*) as total_cheats
        FROM cheat_logs
        WHERE exam_id=%s
    """, (exam_id,))
    
    cheats = cursor.fetchone()["total_cheats"]

    cursor.close()
    conn.close()

    return jsonify({
        "stats": stats,
        "cheats": cheats
    })


# ==========================================
# DESCRIPTIVE ANSWERS API
# ==========================================
@exam_bp.route("/answers/<int:exam_id>", methods=["GET"])
@jwt_required()
def get_answers_api(exam_id):

    from backend.database import get_db_connection

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
            u.user_id,
            u.name,
            q.question_id,   -- 🔥 IMPORTANT FIX
            q.question_text,
            a.text_answer
        FROM answers a
        JOIN questions q ON a.question_id = q.question_id
        JOIN users u ON a.user_id = u.user_id
        WHERE a.exam_id=%s
        AND LOWER(q.question_type) = 'descriptive'
        ORDER BY u.user_id
    """, (exam_id,))

    data = cursor.fetchall()

    print("DEBUG ANSWERS:", data)   # 🔥 DEBUG LINE

    cursor.close()
    conn.close()

    return jsonify(data), 200


# ==========================================
# EVALUATE DESCRIPTIVE MARKS
# ==========================================
@exam_bp.route("/evaluate", methods=["POST"])
@jwt_required()
def evaluate_api():

    from backend.database import get_db_connection

    data = request.json

    user_id = data.get("user_id")
    exam_id = data.get("exam_id")
    question_id = data.get("question_id")
    marks = float(data.get("marks", 0))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # 🔥 GET LIMIT
    cursor.execute("SELECT total_marks FROM exams WHERE exam_id=%s", (exam_id,))
    total_marks = cursor.fetchone()["total_marks"]

    cursor.execute("SELECT COUNT(*) as total_q FROM questions WHERE exam_id=%s", (exam_id,))
    total_q = cursor.fetchone()["total_q"]

    marks_per_q = total_marks / total_q if total_q else 0

    if marks > marks_per_q:
        return jsonify({"error": f"Max allowed {marks_per_q}"}), 400

    # 🔥 SAVE MARKS PER QUESTION
    cursor.execute("""
        UPDATE answers
        SET marks=%s
        WHERE user_id=%s AND exam_id=%s AND question_id=%s
    """, (marks, user_id, exam_id, question_id))

    # 🔥 RE-CALCULATE TOTAL SCORE
    cursor.execute("""
        SELECT 
            q.correct_option,
            q.question_type,
            a.selected_option,
            a.marks
        FROM questions q
        LEFT JOIN answers a
        ON q.question_id = a.question_id
        AND a.user_id = %s
        AND a.exam_id = %s
        WHERE q.exam_id = %s
    """, (user_id, exam_id, exam_id))

    questions = cursor.fetchall()

    total_score = 0

    for q in questions:

        if (q["question_type"] or "").lower() == "mcq":
            if q["selected_option"] == q["correct_option"]:
                total_score += marks_per_q

        else:
            total_score += q.get("marks", 0) or 0

    # 🔥 UPDATE FINAL SCORE
    cursor.execute("""
        UPDATE results
        SET score=%s, evaluation_status='FINAL'
        WHERE user_id=%s AND exam_id=%s
    """, (round(total_score, 2), user_id, exam_id))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Marks updated"}), 200