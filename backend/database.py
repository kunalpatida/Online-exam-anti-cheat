import mysql.connector

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="Kunal@123",
        database="online_exam_system"
    )


