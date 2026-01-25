from backend.database import get_db_connection

def create_exam(title, duration_minutes, total_marks, admin_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        INSERT INTO exams (title, duration_minutes, total_marks, created_by)
        VALUES (%s, %s, %s, %s)
    """

    cursor.execute(query, (title, duration_minutes, total_marks, admin_id))
    conn.commit()

    cursor.close()
    conn.close()

    return True


def add_question(
    exam_id,
    question_text,
    option_a,
    option_b,
    option_c,
    option_d,
    correct_option
):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        INSERT INTO questions
        (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """

    cursor.execute(
        query,
        (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
    )
    conn.commit()

    cursor.close()
    conn.close()

    return True


def get_all_exams():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT exam_id, title, duration_minutes, total_marks FROM exams")
    exams = cursor.fetchall()

    cursor.close()
    conn.close()

    return exams


def get_questions_by_exam(exam_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT question_id, question_text,
               option_a, option_b, option_c, option_d
        FROM questions
        WHERE exam_id = %s
        """,
        (exam_id,)
    )

    questions = cursor.fetchall()

    cursor.close()
    conn.close()

    return questions


def save_answer(user_id, exam_id, question_id, selected_option):
    conn = get_db_connection()
    cursor = conn.cursor()

    # check if answer already exists (autosave logic)
    cursor.execute(
        """
        SELECT answer_id FROM answers
        WHERE user_id=%s AND exam_id=%s AND question_id=%s
        """,
        (user_id, exam_id, question_id)
    )
    existing = cursor.fetchone()

    if existing:
        cursor.execute(
            """
            UPDATE answers
            SET selected_option=%s
            WHERE user_id=%s AND exam_id=%s AND question_id=%s
            """,
            (selected_option, user_id, exam_id, question_id)
        )
    else:
        cursor.execute(
            """
            INSERT INTO answers (user_id, exam_id, question_id, selected_option)
            VALUES (%s, %s, %s, %s)
            """,
            (user_id, exam_id, question_id, selected_option)
        )

    conn.commit()
    cursor.close()
    conn.close()



def submit_exam(user_id, exam_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # fetch total marks
    cursor.execute(
        "SELECT total_marks FROM exams WHERE exam_id=%s",
        (exam_id,)
    )
    exam = cursor.fetchone()
    total_marks = exam["total_marks"]

    # fetch correct answers
    cursor.execute(
        """
        SELECT q.question_id, q.correct_option, a.selected_option
        FROM questions q
        LEFT JOIN answers a
        ON q.question_id = a.question_id
        AND a.user_id = %s
        WHERE q.exam_id = %s
        """,
        (user_id, exam_id)
    )

    questions = cursor.fetchall()
    score = 0

    for q in questions:
        if q["selected_option"] == q["correct_option"]:
            score += 1

    # save result
    cursor.execute(
        """
        INSERT INTO results (user_id, exam_id, score, total_marks)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE score=%s
        """,
        (user_id, exam_id, score, total_marks, score)
    )

    conn.commit()
    cursor.close()
    conn.close()

    return score, total_marks

def log_cheat_event(student_id, exam_id, event_type):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO cheat_logs (student_id, exam_id, event_type)
        VALUES (%s, %s, %s)
        """,
        (student_id, exam_id, event_type)
    )

    conn.commit()
    cursor.close()
    conn.close()



def get_exam_results(exam_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT u.name, u.email, r.score, r.total_marks
        FROM results r
        JOIN users u ON r.user_id = u.user_id
        WHERE r.exam_id = %s
    """, (exam_id,))

    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data


def get_exam_cheat_logs(exam_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT u.name, c.event_type, c.event_time
        FROM cheat_logs c
        JOIN users u ON c.user_id = u.user_id
        WHERE c.exam_id = %s
    """, (exam_id,))

    logs = cursor.fetchall()
    cursor.close()
    conn.close()
    return logs


def log_cheat_event(user_id, exam_id, event_type):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO cheat_logs (user_id, exam_id, event_type)
        VALUES (%s, %s, %s)
    """, (user_id, exam_id, event_type))

    cursor.execute("""
        SELECT COUNT(*) FROM cheat_logs
        WHERE user_id=%s AND exam_id=%s
    """, (user_id, exam_id))

    count = cursor.fetchone()[0]

    conn.commit()
    cursor.close()
    conn.close()

    return count





from datetime import datetime, timedelta

def start_exam_if_not_started(user_id, exam_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT start_time FROM results
        WHERE user_id=%s AND exam_id=%s
    """, (user_id, exam_id))

    row = cursor.fetchone()

    if not row:
        cursor.execute("""
            INSERT INTO results (user_id, exam_id, start_time)
            VALUES (%s, %s, NOW())
        """, (user_id, exam_id))
        conn.commit()

    cursor.close()
    conn.close()


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
