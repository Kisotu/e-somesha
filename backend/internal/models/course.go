package models

import "time"

type Course struct {
	ID           int64     `json:"id"`
	Title        string    `json:"title"`
	Code         string    `json:"code"`
	Description  string    `json:"description"`
	Thumbnail    string    `json:"thumbnail,omitempty"`
	LecturerID   int64     `json:"lecturer_id"`
	LecturerName string    `json:"lecturer_name,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Enrollment struct {
	ID         int64     `json:"id"`
	UserID     int64     `json:"user_id"`
	CourseID   int64     `json:"course_id"`
	EnrolledAt time.Time `json:"enrolled_at"`
}

type Material struct {
	ID        int64     `json:"id"`
	CourseID  int64     `json:"course_id"`
	Title     string    `json:"title"`
	Type      string    `json:"type"`
	FileURL   string    `json:"file_url"`
	FileSize  int64     `json:"file_size"`
	Checksum  string    `json:"checksum"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Quiz struct {
	ID               int64     `json:"id"`
	CourseID         int64     `json:"course_id"`
	Title            string    `json:"title"`
	Description      string    `json:"description"`
	TimeLimitMinutes int       `json:"time_limit_minutes"`
	QuestionCount    int       `json:"question_count,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type QuizQuestion struct {
	ID                 int64     `json:"id"`
	QuizID             int64     `json:"quiz_id"`
	QuestionText       string    `json:"question_text"`
	Options            []string  `json:"options"`
	CorrectOptionIndex int       `json:"-"` // Never expose to students
	Points             int       `json:"points"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type QuizAttempt struct {
	ID          int64     `json:"id"`
	UserID      int64     `json:"user_id"`
	QuizID      int64     `json:"quiz_id"`
	Answers     []int     `json:"answers"`
	Score       int       `json:"score"`
	AttemptedAt time.Time `json:"attempted_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Announcement struct {
	ID        int64     `json:"id"`
	CourseID  int64     `json:"course_id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type MaterialView struct {
	ID         int64     `json:"id"`
	UserID     int64     `json:"user_id"`
	MaterialID int64     `json:"material_id"`
	ViewedAt   time.Time `json:"viewed_at"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type DownloadManifest struct {
	ID        int64     `json:"id"`
	CourseID  int64     `json:"course_id"`
	Files     string    `json:"files"`
	Version   int       `json:"version"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
