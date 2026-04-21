package repository

import (
	"database/sql"
	"elearn-backend/internal/models"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

var ErrCourseNotFound = errors.New("course not found")

type CourseRepository struct {
	db *sql.DB
}

func NewCourseRepository(db *sql.DB) *CourseRepository {
	return &CourseRepository{db: db}
}

func (r *CourseRepository) GetEnrolledCourses(userID int64) ([]models.Course, error) {
	query := `
		SELECT c.id, c.title, c.code, c.description, c.lecturer_id, u.name, c.created_at, c.updated_at
		FROM courses c
		JOIN enrollments e ON c.id = e.course_id
		JOIN users u ON c.lecturer_id = u.id
		WHERE e.user_id = ?
		ORDER BY c.title
	`
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var courses []models.Course
	for rows.Next() {
		var c models.Course
		if err := rows.Scan(&c.ID, &c.Title, &c.Code, &c.Description, &c.LecturerID, &c.LecturerName, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		courses = append(courses, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return courses, nil
}

func (r *CourseRepository) GetByID(id int64) (*models.Course, error) {
	course := &models.Course{}
	err := r.db.QueryRow(`
		SELECT c.id, c.title, c.code, c.description, c.lecturer_id, u.name, c.created_at, c.updated_at
		FROM courses c
		JOIN users u ON c.lecturer_id = u.id
		WHERE c.id = ?
	`, id).Scan(&course.ID, &course.Title, &course.Code, &course.Description, &course.LecturerID, &course.LecturerName, &course.CreatedAt, &course.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, ErrCourseNotFound
	}
	if err != nil {
		return nil, err
	}
	return course, nil
}

func (r *CourseRepository) IsEnrolled(userID, courseID int64) (bool, error) {
	var count int
	err := r.db.QueryRow("SELECT COUNT(*) FROM enrollments WHERE user_id = ? AND course_id = ?", userID, courseID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *CourseRepository) GetMaterials(courseID int64) ([]models.Material, error) {
	rows, err := r.db.Query(`
		SELECT id, course_id, title, type, file_url, file_size, checksum, created_at, updated_at
		FROM materials WHERE course_id = ? ORDER BY title
	`, courseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var materials []models.Material
	for rows.Next() {
		var m models.Material
		if err := rows.Scan(&m.ID, &m.CourseID, &m.Title, &m.Type, &m.FileURL, &m.FileSize, &m.Checksum, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		materials = append(materials, m)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return materials, nil
}

func (r *CourseRepository) GetMaterialByID(id int64) (*models.Material, error) {
	m := &models.Material{}
	err := r.db.QueryRow(`
		SELECT id, course_id, title, type, file_url, file_size, checksum, created_at, updated_at
		FROM materials WHERE id = ?
	`, id).Scan(&m.ID, &m.CourseID, &m.Title, &m.Type, &m.FileURL, &m.FileSize, &m.Checksum, &m.CreatedAt, &m.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *CourseRepository) GetQuizzes(courseID int64) ([]models.Quiz, error) {
	rows, err := r.db.Query(`
		SELECT q.id, q.course_id, q.title, q.description, q.time_limit_minutes, q.created_at, q.updated_at,
			   (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count
		FROM quizzes q WHERE q.course_id = ? ORDER BY q.title
	`, courseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var quizzes []models.Quiz
	for rows.Next() {
		var q models.Quiz
		if err := rows.Scan(&q.ID, &q.CourseID, &q.Title, &q.Description, &q.TimeLimitMinutes, &q.CreatedAt, &q.UpdatedAt, &q.QuestionCount); err != nil {
			return nil, err
		}
		quizzes = append(quizzes, q)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return quizzes, nil
}

func (r *CourseRepository) GetQuizByID(id int64) (*models.Quiz, error) {
	q := &models.Quiz{}
	err := r.db.QueryRow(`
		SELECT id, course_id, title, description, time_limit_minutes, created_at, updated_at
		FROM quizzes WHERE id = ?
	`, id).Scan(&q.ID, &q.CourseID, &q.Title, &q.Description, &q.TimeLimitMinutes, &q.CreatedAt, &q.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return q, nil
}

func (r *CourseRepository) GetQuizQuestions(quizID int64) ([]models.QuizQuestion, error) {
	rows, err := r.db.Query(`
		SELECT id, quiz_id, question_text, options, correct_option_index, points, created_at, updated_at
		FROM quiz_questions WHERE quiz_id = ?
	`, quizID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var questions []models.QuizQuestion
	for rows.Next() {
		var q models.QuizQuestion
		var optionsJSON string
		if err := rows.Scan(&q.ID, &q.QuizID, &q.QuestionText, &optionsJSON, &q.CorrectOptionIndex, &q.Points, &q.CreatedAt, &q.UpdatedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(optionsJSON), &q.Options); err != nil {
			return nil, err
		}
		questions = append(questions, q)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return questions, nil
}

func (r *CourseRepository) GetAnnouncements(courseID int64, since time.Time) ([]models.Announcement, error) {
	rows, err := r.db.Query(`
		SELECT id, course_id, title, content, created_at, updated_at
		FROM announcements WHERE course_id = ? AND created_at >= ? ORDER BY created_at DESC
	`, courseID, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var announcements []models.Announcement
	for rows.Next() {
		var a models.Announcement
		if err := rows.Scan(&a.ID, &a.CourseID, &a.Title, &a.Content, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		announcements = append(announcements, a)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return announcements, nil
}

func (r *CourseRepository) GetAllAnnouncements(courseID int64) ([]models.Announcement, error) {
	rows, err := r.db.Query(`
		SELECT id, course_id, title, content, created_at, updated_at
		FROM announcements WHERE course_id = ? ORDER BY created_at DESC
	`, courseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var announcements []models.Announcement
	for rows.Next() {
		var a models.Announcement
		if err := rows.Scan(&a.ID, &a.CourseID, &a.Title, &a.Content, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		announcements = append(announcements, a)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return announcements, nil
}

func (r *CourseRepository) GetDownloadManifest(courseID int64) (*models.DownloadManifest, error) {
	m := &models.DownloadManifest{}
	err := r.db.QueryRow(`
		SELECT id, course_id, files, version, created_at, updated_at
		FROM download_manifests WHERE course_id = ?
	`, courseID).Scan(&m.ID, &m.CourseID, &m.Files, &m.Version, &m.CreatedAt, &m.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *CourseRepository) SaveQuizAttempt(userID int64, attempt *models.QuizAttempt) (*models.QuizAttempt, error) {
	answersJSON, err := toJSON(attempt.Answers)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal quiz answers: %w", err)
	}

	result, err := r.db.Exec(`
		INSERT INTO quiz_attempts (user_id, quiz_id, answers, score, attempted_at)
		VALUES (?, ?, ?, ?, ?)
	`, userID, attempt.QuizID, answersJSON, attempt.Score, attempt.AttemptedAt)

	if err != nil {
		return nil, err
	}

	id, _ := result.LastInsertId()
	attempt.ID = id
	return attempt, nil
}

func (r *CourseRepository) GetLatestQuizAttempt(userID, quizID int64) (*models.QuizAttempt, error) {
	a := &models.QuizAttempt{}
	var answersJSON string
	err := r.db.QueryRow(`
		SELECT id, user_id, quiz_id, answers, score, attempted_at, created_at, updated_at
		FROM quiz_attempts WHERE user_id = ? AND quiz_id = ?
		ORDER BY attempted_at DESC LIMIT 1
	`, userID, quizID).Scan(&a.ID, &a.UserID, &a.QuizID, &answersJSON, &a.Score, &a.AttemptedAt, &a.CreatedAt, &a.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(answersJSON), &a.Answers); err != nil {
		return nil, err
	}
	return a, nil
}

func (r *CourseRepository) SaveMaterialView(userID, materialID int64, viewedAt time.Time) error {
	_, err := r.db.Exec(`
		INSERT INTO material_views (user_id, material_id, viewed_at)
		VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE viewed_at = VALUES(viewed_at), updated_at = NOW()
	`, userID, materialID, viewedAt)
	return err
}

func (r *CourseRepository) GetMaterialViews(userID int64) ([]models.MaterialView, error) {
	rows, err := r.db.Query(`
		SELECT id, user_id, material_id, viewed_at, created_at, updated_at
		FROM material_views WHERE user_id = ?
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var views []models.MaterialView
	for rows.Next() {
		var v models.MaterialView
		if err := rows.Scan(&v.ID, &v.UserID, &v.MaterialID, &v.ViewedAt, &v.CreatedAt, &v.UpdatedAt); err != nil {
			return nil, err
		}
		views = append(views, v)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return views, nil
}

func (r *CourseRepository) SyncCoursesSince(userID int64, since time.Time) ([]models.Course, []models.Material, []models.Quiz, []models.Announcement, error) {
	courses, err := r.GetEnrolledCourses(userID)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	var allMaterials []models.Material
	var allQuizzes []models.Quiz
	var allAnnouncements []models.Announcement

	for _, course := range courses {
		if course.UpdatedAt.After(since) {
			materials, err := r.GetMaterials(course.ID)
			if err != nil {
				return nil, nil, nil, nil, fmt.Errorf("failed to fetch materials for course %d: %w", course.ID, err)
			}
			allMaterials = append(allMaterials, materials...)

			quizzes, err := r.GetQuizzes(course.ID)
			if err != nil {
				return nil, nil, nil, nil, fmt.Errorf("failed to fetch quizzes for course %d: %w", course.ID, err)
			}
			allQuizzes = append(allQuizzes, quizzes...)

			announcements, err := r.GetAnnouncements(course.ID, since)
			if err != nil {
				return nil, nil, nil, nil, fmt.Errorf("failed to fetch announcements for course %d: %w", course.ID, err)
			}
			allAnnouncements = append(allAnnouncements, announcements...)
		}
	}

	return courses, allMaterials, allQuizzes, allAnnouncements, nil
}

func toJSON(v interface{}) (string, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func (r *CourseRepository) CountAll() (int, error) {
	var count int
	err := r.db.QueryRow("SELECT COUNT(*) FROM courses").Scan(&count)
	return count, err
}

func (r *CourseRepository) CountQuizzes() (int, error) {
	var count int
	err := r.db.QueryRow("SELECT COUNT(*) FROM quizzes").Scan(&count)
	return count, err
}

func (r *CourseRepository) Create(c *models.Course) error {
	query := "INSERT INTO courses (title, description, code, thumbnail, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())"
	result, err := r.db.Exec(query, c.Title, c.Description, c.Code, c.Thumbnail)
	if err != nil {
		return err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	c.ID = id
	return nil
}

func (r *CourseRepository) Update(c *models.Course) error {
	query := "UPDATE courses SET title = ?, description = ?, code = ?, thumbnail = ?, updated_at = NOW() WHERE id = ?"
	_, err := r.db.Exec(query, c.Title, c.Description, c.Code, c.Thumbnail, c.ID)
	return err
}

func (r *CourseRepository) Delete(id int64) error {
	_, err := r.db.Exec("DELETE FROM courses WHERE id = ?", id)
	return err
}

func (r *CourseRepository) EnrollUser(courseID, userID int64) error {
	_, err := r.db.Exec("INSERT IGNORE INTO enrollments (course_id, user_id, enrolled_at) VALUES (?, ?, NOW())", courseID, userID)
	return err
}

func (r *CourseRepository) UnenrollUser(courseID, userID int64) error {
	_, err := r.db.Exec("DELETE FROM enrollments WHERE course_id = ? AND user_id = ?", courseID, userID)
	return err
}

func (r *CourseRepository) ListAll() ([]models.Course, error) {
	rows, err := r.db.Query("SELECT id, title, description, code, thumbnail, created_at, updated_at FROM courses ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var courses []models.Course
	for rows.Next() {
		var c models.Course
		if err := rows.Scan(&c.ID, &c.Title, &c.Description, &c.Code, &c.Thumbnail, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		courses = append(courses, c)
	}
	return courses, nil
}

func (r *CourseRepository) CreateMaterial(m *models.Material) error {
	query := "INSERT INTO materials (course_id, title, type, file_url, file_size, checksum, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())"
	result, err := r.db.Exec(query, m.CourseID, m.Title, m.Type, m.FileURL, m.FileSize, m.Checksum)
	if err != nil {
		return err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	m.ID = id
	return nil
}

func (r *CourseRepository) UpdateMaterial(m *models.Material) error {
	query := "UPDATE materials SET title = ?, type = ?, file_url = ?, file_size = ?, checksum = ?, updated_at = NOW() WHERE id = ?"
	_, err := r.db.Exec(query, m.Title, m.Type, m.FileURL, m.FileSize, m.Checksum, m.ID)
	return err
}

func (r *CourseRepository) DeleteMaterial(id int64) error {
	_, err := r.db.Exec("DELETE FROM materials WHERE id = ?", id)
	return err
}

func (r *CourseRepository) CreateAnnouncement(a *models.Announcement) error {
	query := "INSERT INTO announcements (course_id, title, content, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())"
	result, err := r.db.Exec(query, a.CourseID, a.Title, a.Content)
	if err != nil {
		return err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	a.ID = id
	return nil
}

func (r *CourseRepository) UpdateAnnouncement(a *models.Announcement) error {
	query := "UPDATE announcements SET title = ?, content = ?, updated_at = NOW() WHERE id = ?"
	_, err := r.db.Exec(query, a.Title, a.Content, a.ID)
	return err
}

func (r *CourseRepository) DeleteAnnouncement(id int64) error {
	_, err := r.db.Exec("DELETE FROM announcements WHERE id = ?", id)
	return err
}

func (r *CourseRepository) CreateQuiz(q *models.Quiz) error {
	query := "INSERT INTO quizzes (course_id, title, description, time_limit_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())"
	result, err := r.db.Exec(query, q.CourseID, q.Title, q.Description, q.TimeLimitMinutes)
	if err != nil {
		return err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	q.ID = id
	return nil
}

func (r *CourseRepository) UpdateQuiz(q *models.Quiz) error {
	query := "UPDATE quizzes SET title = ?, description = ?, time_limit_minutes = ?, updated_at = NOW() WHERE id = ?"
	_, err := r.db.Exec(query, q.Title, q.Description, q.TimeLimitMinutes, q.ID)
	return err
}

func (r *CourseRepository) DeleteQuiz(id int64) error {
	_, err := r.db.Exec("DELETE FROM quizzes WHERE id = ?", id)
	return err
}

func (r *CourseRepository) CreateQuizQuestion(q *models.QuizQuestion) error {
	optionsJSON, err := json.Marshal(q.Options)
	if err != nil {
		return err
	}
	query := "INSERT INTO quiz_questions (quiz_id, question_text, options, correct_option_index, points, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())"
	result, err := r.db.Exec(query, q.QuizID, q.QuestionText, string(optionsJSON), q.CorrectOptionIndex, q.Points)
	if err != nil {
		return err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	q.ID = id
	return nil
}

func (r *CourseRepository) UpdateQuizQuestion(q *models.QuizQuestion) error {
	optionsJSON, err := json.Marshal(q.Options)
	if err != nil {
		return err
	}
	query := "UPDATE quiz_questions SET question_text = ?, options = ?, correct_option_index = ?, points = ?, updated_at = NOW() WHERE id = ?"
	_, err = r.db.Exec(query, q.QuestionText, string(optionsJSON), q.CorrectOptionIndex, q.Points, q.ID)
	return err
}

func (r *CourseRepository) DeleteQuizQuestion(id int64) error {
	_, err := r.db.Exec("DELETE FROM quiz_questions WHERE id = ?", id)
	return err
}
