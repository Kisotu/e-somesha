package services

import (
	"elearn-backend/internal/models"
	"elearn-backend/internal/repository"
	"time"
)

type SyncService struct {
	courseRepo *repository.CourseRepository
}

func NewSyncService(courseRepo *repository.CourseRepository) *SyncService {
	return &SyncService{courseRepo: courseRepo}
}

func (s *SyncService) GetChangesSince(userID int64, since time.Time) (*models.SyncResponse, error) {
	courses, materials, quizzes, announcements, err := s.courseRepo.SyncCoursesSince(userID, since)
	if err != nil {
		return nil, err
	}

	return &models.SyncResponse{
		Courses:       courses,
		Materials:     materials,
		Quizzes:       quizzes,
		Announcements: announcements,
		Timestamp:     time.Now(),
	}, nil
}

func (s *SyncService) SyncMaterialViews(userID int64, views []models.MaterialViewSync) (*models.MaterialViewSyncResponse, error) {
	synced := 0
	var rejected []int64

	for _, view := range views {
		if view.UserID != userID {
			rejected = append(rejected, view.MaterialID)
			continue
		}

		err := s.courseRepo.SaveMaterialView(view.UserID, view.MaterialID, view.ViewedAt)
		if err != nil {
			rejected = append(rejected, view.MaterialID)
		} else {
			synced++
		}
	}

	return &models.MaterialViewSyncResponse{
		Synced:   synced,
		Rejected: rejected,
	}, nil
}

func (s *SyncService) SyncQuizAttempts(userID int64, attempts []models.QuizAttemptSync) (*models.QuizAttemptSyncResponse, error) {
	synced := 0
	var conflicts []models.QuizConflictResult
	var rejected []models.QuizRejectResult

	for _, attempt := range attempts {
		if attempt.UserID != userID {
			rejected = append(rejected, models.QuizRejectResult{
				QuizID: attempt.QuizID,
				Reason: "User ID mismatch",
			})
			continue
		}

		existingAttempt, err := s.courseRepo.GetLatestQuizAttempt(userID, attempt.QuizID)
		if err == nil && existingAttempt != nil {
			if attempt.AttemptedAt.Before(existingAttempt.AttemptedAt) {
				conflicts = append(conflicts, models.QuizConflictResult{
					QuizID:     attempt.QuizID,
					LocalTime:  attempt.AttemptedAt,
					ServerTime: existingAttempt.AttemptedAt,
					Resolution: "server_wins",
				})
				continue
			}
		}

		quizAttempt := &models.QuizAttempt{
			QuizID:      attempt.QuizID,
			Answers:     attempt.Answers,
			Score:       attempt.Score,
			AttemptedAt: attempt.AttemptedAt,
		}

		_, err = s.courseRepo.SaveQuizAttempt(userID, quizAttempt)
		if err != nil {
			rejected = append(rejected, models.QuizRejectResult{
				QuizID: attempt.QuizID,
				Reason: err.Error(),
			})
		} else {
			synced++
		}
	}

	return &models.QuizAttemptSyncResponse{
		Synced:    synced,
		Conflicts: conflicts,
		Rejected:  rejected,
	}, nil
}