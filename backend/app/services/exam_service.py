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
