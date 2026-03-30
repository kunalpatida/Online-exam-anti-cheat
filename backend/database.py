import mysql.connector
from mysql.connector import Error


def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host="localhost",          # change if deployed
            user="root",               # your MySQL username
            password="Kunal@123", # 🔥 change this
            database="online_exam_system",   # your DB name
            port=3306
        )

        if conn.is_connected():
            return conn

    except Error as e:
        print("❌ Database connection error:", str(e))
        return None