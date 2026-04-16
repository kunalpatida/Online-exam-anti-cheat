from backend.database import get_db_connection
from app.utils.password_utils import hash_password, verify_password
from werkzeug.security import generate_password_hash, check_password_hash


def register_user(name, email, password, organization):
    conn = get_db_connection()
    cursor = conn.cursor()

    hashed_password = generate_password_hash(password)

    cursor.execute("""
        INSERT INTO users (name, email, password, organization)
        VALUES (%s, %s, %s, %s)
    """, (name, email, hashed_password, organization))

    conn.commit()
    cursor.close()
    conn.close()

    return True


def login_user(email, password):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()

    cursor.close()
    conn.close()

    if not user:
        return False, "User not found"

    if not check_password_hash(user["password"], password):
        return False, "Invalid password"

    return True, user


def get_user_role(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT role FROM users WHERE user_id = %s", (user_id,))
    user = cursor.fetchone()

    cursor.close()
    conn.close()

    if user:
        return user["role"]
    return None