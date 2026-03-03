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


def add_question(exam_id, question_text, option_a=None, option_b=None,
                 option_c=None, option_d=None,
                 correct_option=None, question_type="MCQ"):

    conn = get_db_connection()
    cursor = conn.cursor()

    if question_type == "MCQ":
        cursor.execute("""
            INSERT INTO questions 
            (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, question_type)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (exam_id, question_text, option_a, option_b,
              option_c, option_d, correct_option, question_type))

    else:  # DESCRIPTIVE
        cursor.execute("""
            INSERT INTO questions 
            (exam_id, question_text, correct_option, question_type)
            VALUES (%s, %s, %s, %s)
        """, (exam_id, question_text, correct_option, question_type))

    conn.commit()
    cursor.close()
    conn.close()

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


def save_answer(user_id, exam_id, question_id,
                selected_option=None, text_answer=None):

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Get question type
    cursor.execute("""
        SELECT question_type FROM questions
        WHERE question_id=%s
    """, (question_id,))
    question = cursor.fetchone()

    if not question:
        cursor.close()
        conn.close()
        return

    question_type = question["question_type"]

    # Check if answer already exists
    cursor.execute("""
        SELECT answer_id FROM answers
        WHERE user_id=%s AND exam_id=%s AND question_id=%s
    """, (user_id, exam_id, question_id))

    existing = cursor.fetchone()

    if existing:
        if question_type == "MCQ":
            cursor.execute("""
                UPDATE answers
                SET selected_option=%s
                WHERE user_id=%s AND exam_id=%s AND question_id=%s
            """, (selected_option, user_id, exam_id, question_id))
        else:
            cursor.execute("""
                UPDATE answers
                SET text_answer=%s
                WHERE user_id=%s AND exam_id=%s AND question_id=%s
            """, (text_answer, user_id, exam_id, question_id))
    else:
        if question_type == "MCQ":
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

    # fetch questions + answers
    cursor.execute("""
        SELECT 
            q.question_id,
            q.correct_option,
            q.question_type,
            a.selected_option,
            a.text_answer
        FROM questions q
        LEFT JOIN answers a
            ON q.question_id = a.question_id
            AND a.user_id = %s
            AND a.exam_id = %s
        WHERE q.exam_id = %s
    """, (user_id, exam_id, exam_id))

    questions = cursor.fetchall()

    score = 0
    has_descriptive = False

    for q in questions:
        # MCQ auto grading
        if q["question_type"] == "MCQ":
            if q["selected_option"] == q["correct_option"]:
                score += 1
        else:
            # Descriptive question present
            has_descriptive = True

    # decide evaluation status
    evaluation_status = "PENDING" if has_descriptive else "AUTO"

    # save/update result
    status = "SUBMITTED"
    

    cursor.execute("""
    INSERT INTO results 
    (user_id, exam_id, score, total_marks, evaluation_status, status)
    VALUES (%s, %s, %s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE 
        score=VALUES(score),
        evaluation_status=VALUES(evaluation_status),
        status=VALUES(status)
    """, (
    user_id,
    exam_id,
    score,
    total_marks,
    evaluation_status,
    status
    ))

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
        SELECT status FROM results
        WHERE user_id=%s AND exam_id=%s
    """, (user_id, exam_id))

    existing = cursor.fetchone()

    if not existing:
        cursor.execute("""
            INSERT INTO results 
            (user_id, exam_id, score, total_marks, start_time, status)
            SELECT %s, %s, 0, total_marks, NOW(), 'IN_PROGRESS'
            FROM exams WHERE exam_id=%s
        """, (user_id, exam_id, exam_id))

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



from backend.app.services.ai_service import generate_wrong_options


def add_ai_generated_question(exam_id, question_text, correct_answer):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Generate wrong options
    wrong_options = generate_wrong_options(question_text, correct_answer)

    import random

    options = [correct_answer] + wrong_options
    random.shuffle(options)

    option_a = options[0]
    option_b = options[1]
    option_c = options[2]
    option_d = options[3]

    cursor.execute("""
        INSERT INTO questions
        (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, question_type)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'MCQ')
    """, (
        exam_id,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        option_a
    ))

    conn.commit()
    cursor.close()
    conn.close()

    return {
        "question_text": question_text,
        "correct_answer": correct_answer,
        "wrong_options": wrong_options
    }


from backend.app.services.ai_service import generate_full_exam


def add_full_ai_exam(exam_id, subject, topic, difficulty, count):
    import random

    conn = get_db_connection()
    cursor = conn.cursor()

    questions = generate_full_exam(subject, topic, difficulty, count)

    inserted_count = 0

    for q in questions:

        # 🔹 STEP 1: Prevent duplicate question
        cursor.execute("""
            SELECT question_id FROM questions
            WHERE exam_id=%s AND question_text=%s
        """, (exam_id, q["question_text"]))

        if cursor.fetchone():
            continue  # Skip duplicate question

        # 🔹 STEP 2: Shuffle options
        options = [q["correct_answer"]] + q["wrong_options"]
        random.shuffle(options)

        option_a = options[0]
        option_b = options[1]
        option_c = options[2]
        option_d = options[3]

        # 🔹 STEP 3: Insert question
        cursor.execute("""
            INSERT INTO questions
            (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, question_type)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'MCQ')
        """, (
            exam_id,
            q["question_text"],
            option_a,
            option_b,
            option_c,
            option_d,
            q["correct_answer"]
        ))

        inserted_count += 1

    conn.commit()
    cursor.close()
    conn.close()

    return inserted_count