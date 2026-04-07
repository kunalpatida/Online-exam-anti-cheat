from database import get_db_connection
from app.services.ai_service import generate_wrong_options, generate_full_exam

import random
import string
import uuid
from datetime import datetime, timedelta


# ------------------------------------------------------------------
# Generate a unique 6-character exam code (2 letters + 4 digits)
# ------------------------------------------------------------------
def generate_exam_code():
    letters = "".join(random.choices(string.ascii_uppercase, k=2))
    numbers = "".join(random.choices(string.digits, k=4))
    return f"{letters}{numbers}"


# ------------------------------------------------------------------
# Create exam shell in DB.
# Only stores title, duration, marks, timing, and creator.
# Questions are added separately after this.
# ------------------------------------------------------------------
def create_exam(title, duration_minutes, total_marks, admin_id, start_time=None, end_time=None):
    conn = get_db_connection()
    cursor = conn.cursor()

    exam_code = generate_exam_code()

    cursor.execute("""
        INSERT INTO exams
            (title, duration_minutes, total_marks, created_by, exam_code, start_time, end_time)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (title, duration_minutes, total_marks, admin_id, exam_code, start_time, end_time))

    conn.commit()
    cursor.close()
    conn.close()

    return exam_code


# ------------------------------------------------------------------
# Add a single question to an exam.
# MCQ questions include four options and a correct option label.
# Descriptive questions only need question_text.
# ------------------------------------------------------------------
def add_question(exam_id, question_text, option_a=None, option_b=None,
                 option_c=None, option_d=None, correct_option=None, question_type="MCQ"):
    conn = get_db_connection()
    cursor = conn.cursor()

    if question_type.upper() == "MCQ":
        cursor.execute("""
            INSERT INTO questions
                (exam_id, question_text, option_a, option_b, option_c, option_d,
                 correct_option, question_type)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (exam_id, question_text, option_a, option_b,
              option_c, option_d, correct_option, question_type))
    else:
        cursor.execute("""
            INSERT INTO questions (exam_id, question_text, question_type)
            VALUES (%s, %s, %s)
        """, (exam_id, question_text, question_type))

    conn.commit()
    cursor.close()
    conn.close()


# ------------------------------------------------------------------
# Get all exams created by a specific teacher.
# Includes attempt count per exam from results table.
# ------------------------------------------------------------------
def get_all_exams(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            e.exam_id,
            e.title,
            e.duration_minutes,
            e.total_marks,
            e.exam_code,
            COUNT(r.result_id) AS attempts
        FROM exams e
        LEFT JOIN results r ON e.exam_id = r.exam_id
        WHERE e.created_by = %s
        GROUP BY e.exam_id
        ORDER BY e.exam_id DESC
    """, (user_id,))

    exams = cursor.fetchall()
    cursor.close()
    conn.close()

    return exams


# ------------------------------------------------------------------
# Get all questions for an exam (without correct_option exposed).
# correct_option is kept in the result so shuffle logic can use it,
# but it is NOT sent to the student frontend directly.
# ------------------------------------------------------------------
def get_questions_by_exam(exam_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT question_id, question_text,
               option_a, option_b, option_c, option_d,
               correct_option, question_type
        FROM questions
        WHERE exam_id = %s
    """, (exam_id,))

    questions = cursor.fetchall()
    cursor.close()
    conn.close()

    return questions


# ------------------------------------------------------------------
# Save or update a student answer.
# MCQ answers use selected_option (the text of the chosen option).
# Descriptive answers use text_answer.
# Upsert logic: update if answer exists, insert if not.
# ------------------------------------------------------------------
def save_answer(user_id, exam_id, question_id, selected_option=None, text_answer=None):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT question_type FROM questions WHERE question_id=%s", (question_id,)
    )
    question = cursor.fetchone()

    if not question:
        cursor.close()
        conn.close()
        return

    q_type = question["question_type"]

    cursor.execute("""
        SELECT answer_id FROM answers
        WHERE user_id=%s AND exam_id=%s AND question_id=%s
    """, (user_id, exam_id, question_id))
    existing = cursor.fetchone()

    if existing:
        if q_type.upper() == "MCQ":
            cursor.execute("""
                UPDATE answers SET selected_option=%s
                WHERE user_id=%s AND exam_id=%s AND question_id=%s
            """, (selected_option, user_id, exam_id, question_id))
        else:
            cursor.execute("""
                UPDATE answers SET text_answer=%s
                WHERE user_id=%s AND exam_id=%s AND question_id=%s
            """, (text_answer, user_id, exam_id, question_id))
    else:
        if q_type.upper() == "MCQ":
            cursor.execute("""
                INSERT INTO answers (user_id, exam_id, question_id, selected_option)
                VALUES (%s, %s, %s, %s)
            """, (user_id, exam_id, question_id, selected_option))
        else:
            cursor.execute("""
                INSERT INTO answers (user_id, exam_id, question_id, text_answer)
                VALUES (%s, %s, %s, %s)
            """, (user_id, exam_id, question_id, text_answer))

    conn.commit()
    cursor.close()
    conn.close()


# ------------------------------------------------------------------
# Submit exam and calculate initial score.
#
# Marks logic:
#   - marks_per_q = total_marks / total_questions  (all equal share)
#   - MCQ: auto-graded if selected_option matches correct_option
#   - Descriptive: score = 0 until teacher evaluates manually
#   - evaluation_status = AUTO if all MCQ, PENDING if has descriptive
# ------------------------------------------------------------------
def submit_exam(user_id, exam_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT total_marks FROM exams WHERE exam_id=%s", (exam_id,))
    total_marks = cursor.fetchone()["total_marks"]

    cursor.execute(
        "SELECT COUNT(*) as total_q FROM questions WHERE exam_id=%s", (exam_id,)
    )
    total_q = cursor.fetchone()["total_q"]

    marks_per_q = round(total_marks / total_q, 4) if total_q else 0

    cursor.execute("""
        SELECT
            q.question_id,
            q.question_type,
            q.correct_option,
            a.selected_option
        FROM questions q
        LEFT JOIN answers a
            ON q.question_id = a.question_id
           AND a.user_id = %s
           AND a.exam_id = %s
        WHERE q.exam_id = %s
    """, (user_id, exam_id, exam_id))

    questions = cursor.fetchall()

    mcq_score = 0.0
    has_descriptive = False

    for q in questions:
        q_type = (q["question_type"] or "").lower()
        if q_type == "mcq":
            if q["selected_option"] and q["selected_option"] == q["correct_option"]:
                mcq_score += marks_per_q
        else:
            has_descriptive = True

    mcq_score = round(mcq_score, 2)
    eval_status = "PENDING" if has_descriptive else "AUTO"

    cursor.execute("""
        INSERT INTO results
            (user_id, exam_id, score, total_marks, evaluation_status, status)
        VALUES (%s, %s, %s, %s, %s, 'SUBMITTED')
        ON DUPLICATE KEY UPDATE
            score = VALUES(score),
            evaluation_status = VALUES(evaluation_status),
            status = 'SUBMITTED'
    """, (user_id, exam_id, mcq_score, total_marks, eval_status))

    conn.commit()
    cursor.close()
    conn.close()

    print(f"submit_exam: user={user_id} exam={exam_id} score={mcq_score}/{total_marks} status={eval_status}")

    return mcq_score, total_marks


# ------------------------------------------------------------------
# Log a cheat event (tab switch, window blur, etc.)
# Returns total cheat count for this student in this exam.
# ------------------------------------------------------------------
def log_cheat_event(user_id, exam_id, event_type):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO cheat_logs (student_id, exam_id, event_type)
        VALUES (%s, %s, %s)
    """, (user_id, exam_id, event_type))

    cursor.execute("""
        SELECT COUNT(*) FROM cheat_logs
        WHERE student_id=%s AND exam_id=%s
    """, (user_id, exam_id))

    count = cursor.fetchone()[0]

    conn.commit()
    cursor.close()
    conn.close()

    return count


# ------------------------------------------------------------------
# Get all student results for a given exam (teacher view).
# Includes name, email, score, total_marks, cheat count.
# ------------------------------------------------------------------
def get_exam_results(exam_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            u.name,
            u.email,
            r.score,
            r.evaluation_status,
            e.total_marks,
            COALESCE((
                SELECT COUNT(*)
                FROM cheat_logs c
                WHERE c.student_id = r.user_id
                  AND c.exam_id = r.exam_id
                  AND LOWER(TRIM(c.event_type)) = 'tab_switch'
            ), 0) AS cheat_count
        FROM results r
        JOIN users u ON r.user_id = u.user_id
        JOIN exams e ON r.exam_id = e.exam_id
        WHERE r.exam_id = %s
    """, (exam_id,))

    results = cursor.fetchall()
    cursor.close()
    conn.close()

    return results


# ------------------------------------------------------------------
# Start exam session on first load.
# Inserts a result row with status IN_PROGRESS and records start time.
# Returns session token for this attempt.
# If already started, returns existing session token.
# ------------------------------------------------------------------
def start_exam_if_not_started(user_id, exam_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT status, session_token FROM results
        WHERE user_id=%s AND exam_id=%s
    """, (user_id, exam_id))
    existing = cursor.fetchone()

    if not existing:
        token = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO results
                (user_id, exam_id, score, total_marks, start_time, status, session_token)
            SELECT %s, %s, 0, total_marks, NOW(), 'IN_PROGRESS', %s
            FROM exams WHERE exam_id=%s
        """, (user_id, exam_id, token, exam_id))
        conn.commit()
        cursor.close()
        conn.close()
        return token

    cursor.close()
    conn.close()
    return existing["session_token"]


# ------------------------------------------------------------------
# Check if exam time is over for a student.
# Compares current time against start_time + duration.
# ------------------------------------------------------------------
def is_exam_time_over(user_id, exam_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT r.start_time, e.duration_minutes
        FROM results r
        JOIN exams e ON r.exam_id = e.exam_id
        WHERE r.user_id=%s AND r.exam_id=%s
    """, (user_id, exam_id))

    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if not row or not row["start_time"]:
        return False

    end_time = row["start_time"] + timedelta(minutes=row["duration_minutes"])
    return datetime.now() > end_time


# ------------------------------------------------------------------
# Look up an exam by its code.
# Returns exam metadata or None if not found.
# ------------------------------------------------------------------
def get_exam_by_code(exam_code):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT exam_id, title, duration_minutes, total_marks, start_time, end_time
        FROM exams
        WHERE exam_code = %s
    """, (exam_code,))

    exam = cursor.fetchone()
    cursor.close()
    conn.close()

    return exam


# ------------------------------------------------------------------
# Check if a student has already attempted this exam.
# Returns the result row (with status) or None.
# ------------------------------------------------------------------
def get_exam_attempt(user_id, exam_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT status FROM results
        WHERE user_id=%s AND exam_id=%s
    """, (user_id, exam_id))

    attempt = cursor.fetchone()
    cursor.close()
    conn.close()

    return attempt


# ------------------------------------------------------------------
# Get all saved answers for a student in an exam.
# Used to restore answers if the student refreshes the page.
# ------------------------------------------------------------------
def get_saved_answers(user_id, exam_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT question_id, selected_option, text_answer
        FROM answers
        WHERE user_id=%s AND exam_id=%s
    """, (user_id, exam_id))

    answers = cursor.fetchall()
    cursor.close()
    conn.close()

    return answers
