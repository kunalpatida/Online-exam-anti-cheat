USE online_exam_system;

SELECT user_id, name, email, role FROM users;

UPDATE users
SET role = 'admin'
WHERE email = 'test@example.com';


SELECT user_id, name, email, role FROM users;
