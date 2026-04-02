import mysql.connector
from mysql.connector import Error
import os


def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=os.environ.get("DB_HOST", "localhost"),
            user=os.environ.get("DB_USER", "root"),
            password=os.environ.get("DB_PASSWORD", ""),
            database=os.environ.get("DB_NAME", "online_exam_system"),
            port=int(os.environ.get("DB_PORT", 3306))
        )
        if conn.is_connected():
            return conn
    except Error as e:
        print("❌ Database connection error:", str(e))
        return None