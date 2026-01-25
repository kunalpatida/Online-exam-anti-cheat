-- Database schema for Online Exam Anti-Cheat System

CREATE DATABASE online_exam_system;
USE online_exam_system;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'student') NOT NULL
);

CREATE TABLE exams (
    exam_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    duration_minutes INT NOT NULL,
    total_marks INT NOT NULL,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

CREATE TABLE questions (
    question_id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT,
    question_text TEXT NOT NULL,
    option_a VARCHAR(255),
    option_b VARCHAR(255),
    option_c VARCHAR(255),
    option_d VARCHAR(255),
    correct_option CHAR(1),
    FOREIGN KEY (exam_id) REFERENCES exams(exam_id)
);

CREATE TABLE student_exams (
    student_exam_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    exam_id INT,
    start_time DATETIME,
    end_time DATETIME,
    status ENUM('started', 'submitted'),
    FOREIGN KEY (student_id) REFERENCES users(user_id),
    FOREIGN KEY (exam_id) REFERENCES exams(exam_id)
);

CREATE TABLE student_answers (
    student_id INT,
    question_id INT,
    selected_option CHAR(1),
    PRIMARY KEY (student_id, question_id),
    FOREIGN KEY (student_id) REFERENCES users(user_id),
    FOREIGN KEY (question_id) REFERENCES questions(question_id)
);

CREATE TABLE cheat_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    exam_id INT,
    event_type VARCHAR(50),
    event_time DATETIME,
    FOREIGN KEY (student_id) REFERENCES users(user_id),
    FOREIGN KEY (exam_id) REFERENCES exams(exam_id)
);
           



