-- Seed data for E-Learning database
-- Run this after migrations

USE elearn;

-- Insert demo users
INSERT INTO users (email, password_hash, name, role) VALUES
('lecturer@university.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.rKsLY7zNdCFBsAqKCK', 'Dr. Jane Smith', 'lecturer'),
('student@university.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.rKsLY7zNdCFBsAqKCK', 'John Doe', 'student')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Insert demo courses
INSERT INTO courses (title, code, description, lecturer_id) VALUES
('Introduction to Computer Science', 'CS101', 'Fundamentals of programming and computer science', 1),
('Data Structures and Algorithms', 'CS201', 'Advanced data structures and algorithm design', 1),
('Database Systems', 'CS301', 'Relational databases, SQL, and database design', 1)
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- Enroll student in courses
INSERT INTO enrollments (user_id, course_id) VALUES
(2, 1), (2, 2), (2, 3)
ON DUPLICATE KEY UPDATE enrolled_at=VALUES(enrolled_at);

-- Insert materials for CS101
INSERT INTO materials (course_id, title, type, file_url, file_size, checksum) VALUES
(1, 'Course Introduction', 'pdf', 'https://api.example.com/files/cs101/intro.pdf', 1048576, 'sha256:abc123'),
(1, 'Week 1: Basics of Programming', 'slide', 'https://api.example.com/files/cs101/week1.pptx', 2097152, 'sha256:def456'),
(1, 'Programming Notes', 'note', 'https://api.example.com/files/cs101/notes.txt', 512000, 'sha256:ghi789'),
(1, 'Week 2: Variables and Data Types', 'pdf', 'https://api.example.com/files/cs101/week2.pdf', 1572864, 'sha256:jkl012')
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- Insert quizzes for CS101
INSERT INTO quizzes (course_id, title, description, time_limit_minutes) VALUES
(1, 'Quiz 1: Programming Basics', 'Test your knowledge of basic programming concepts', 30),
(1, 'Quiz 2: Variables and Data Types', 'Test your understanding of variables', 20)
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- Insert quiz questions for Quiz 1
INSERT INTO quiz_questions (quiz_id, question_text, options, correct_option_index, points) VALUES
(1, 'What is a variable?', '["A container for storing data values", "A type of loop", "A function", "A comment"]', 0, 1),
(1, 'Which is a valid data type in most programming languages?', '["Integer", "Loop", "Function", "Class"]', 0, 1),
(1, 'What does CPU stand for?', '["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Computer Processing Unit"]', 0, 1),
(1, 'Which symbol is used for comments in Python?', '["#", "//", "/*", "--"]', 0, 1),
(1, 'What is the output of print(2+3)?', '["5", "2+3", "23", "Error"]', 0, 1)
ON DUPLICATE KEY UPDATE question_text=VALUES(question_text);

-- Insert quiz questions for Quiz 2
INSERT INTO quiz_questions (quiz_id, question_text, options, correct_option_index, points) VALUES
(2, 'What is an integer?', '["A whole number", "A decimal number", "A text string", "A boolean"]', 0, 1),
(2, 'Which is a floating-point number?', '["3.14", "42", "Hello", "True"]', 0, 1),
(2, 'What is the result of 10/3 in most languages?', '["3.333...", "3", "4", "Error"]', 0, 1)
ON DUPLICATE KEY UPDATE question_text=VALUES(question_text);

-- Insert announcements
INSERT INTO announcements (course_id, title, content) VALUES
(1, 'Welcome to CS101', 'Welcome to Introduction to Computer Science! This course will introduce you to fundamental programming concepts.'),
(1, 'Week 1 Assignment', 'Complete exercises 1-5 from the textbook by end of week.'),
(1, 'Midterm Exam Date', 'The midterm exam will be held on April 30th in Room 301.')
ON DUPLICATE KEY UPDATE content=VALUES(content);

-- Insert download manifests
INSERT INTO download_manifests (course_id, files, version) VALUES
(1, '[{"material_id":1,"title":"Course Introduction","type":"pdf","url":"https://api.example.com/files/cs101/intro.pdf"},{"material_id":2,"title":"Week 1: Basics of Programming","type":"slide","url":"https://api.example.com/files/cs101/week1.pptx"}]', 1),
(2, '[]', 1),
(3, '[]', 1)
ON DUPLICATE KEY UPDATE version=VALUES(version);

-- Note: Password for all users is 'password123' (bcrypt hash)
-- In production, hash passwords properly before inserting