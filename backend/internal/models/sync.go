package models

import "time"

type SyncRequest struct {
	LastSync string `json:"last_sync"`
}

type SyncResponse struct {
	Courses       []Course       `json:"courses"`
	Materials     []Material     `json:"materials"`
	Quizzes       []Quiz         `json:"quizzes"`
	Announcements []Announcement `json:"announcements"`
	Timestamp     time.Time      `json:"timestamp"`
}

type MaterialViewSync struct {
	UserID     int64     `json:"user_id" binding:"required"`
	MaterialID int64     `json:"material_id" binding:"required"`
	ViewedAt   time.Time `json:"viewed_at" binding:"required"`
}

type MaterialViewSyncRequest struct {
	Views []MaterialViewSync `json:"views" binding:"required,max=1000"`
}

type MaterialViewSyncResponse struct {
	Synced          int                        `json:"synced"`
	Rejected        []int64                    `json:"rejected"`
	RejectedDetails []MaterialViewRejectResult `json:"rejected_details,omitempty"`
}

type MaterialViewRejectResult struct {
	MaterialID int64  `json:"material_id"`
	Reason     string `json:"reason"`
}

type QuizAttemptSync struct {
	UserID      int64     `json:"user_id" binding:"required"`
	QuizID      int64     `json:"quiz_id" binding:"required"`
	Answers     []int     `json:"answers" binding:"required"`
	Score       int       `json:"score" binding:"required"`
	AttemptedAt time.Time `json:"attempted_at" binding:"required"`
}

type QuizAttemptSyncRequest struct {
	Attempts []QuizAttemptSync `json:"attempts" binding:"required,max=500"`
}

type QuizAttemptSyncResponse struct {
	Synced    int                  `json:"synced"`
	Conflicts []QuizConflictResult `json:"conflicts"`
	Rejected  []QuizRejectResult   `json:"rejected"`
}

type QuizConflictResult struct {
	QuizID     int64     `json:"quiz_id"`
	LocalTime  time.Time `json:"local_time"`
	ServerTime time.Time `json:"server_time"`
	Resolution string    `json:"resolution"`
}

type QuizRejectResult struct {
	QuizID int64  `json:"quiz_id"`
	Reason string `json:"reason"`
}

type DownloadManifestFile struct {
	MaterialID int64  `json:"material_id"`
	Title      string `json:"title"`
	Type       string `json:"type"`
	URL        string `json:"url"`
	FileSize   int64  `json:"file_size"`
	Checksum   string `json:"checksum"`
}

type DownloadManifestResponse struct {
	CourseID      int64                  `json:"course_id"`
	Version       int                    `json:"version"`
	Files         []DownloadManifestFile `json:"files"`
	Quizzes       []Quiz                 `json:"quizzes"`
	Announcements []Announcement         `json:"announcements"`
}
