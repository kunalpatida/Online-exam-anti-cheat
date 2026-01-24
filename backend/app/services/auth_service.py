from backend.database import get_db_connection
from backend.app.utils.password_utils import hash_password, verify_password

def register_user(name, email, password, role="student"):
    conn = get_db_connection()
    cursor = conn.cursor()

    hashed_password = hash_password(password)

    query = """
        INSERT INTO users (name, email, password_hash, role)
        VALUES (%s, %s, %s, %s)
    """

    cursor.execute(query, (name, email, hashed_password, role))
    conn.commit()

    cursor.close()
    conn.close()

    return True

def login_user(email, password):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = "SELECT * FROM users WHERE email = %s"
    cursor.execute(query, (email,))
    user = cursor.fetchone()

    cursor.close()
    conn.close()

    if not user:
        return False, "User not found"

    if verify_password(password, user["password_hash"]):
        return True, user
    else:
        return False, "Invalid password"
