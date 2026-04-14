package handlers

import (
	"elearn-backend/internal/models"
	"elearn-backend/internal/repository"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type SyncHandler struct {
	courseRepo *repository.CourseRepository
}

func NewSyncHandler(courseRepo *repository.CourseRepository) *SyncHandler {
	return &SyncHandler{courseRepo: courseRepo}
}

func (h *SyncHandler) SyncCourses(c *gin.Context) {
	userID := c.GetInt64("userID")
	lastSyncStr := c.Query("last_sync")

	var lastSync time.Time
	if lastSyncStr != "" {
		var err error
		lastSync, err = time.Parse(time.RFC3339, lastSyncStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid last_sync format, use RFC3339"})
			return
		}
	} else {
		lastSync = time.Now().AddDate(0, -1, 0)
	}

	courses, materials, quizzes, announcements, err := h.courseRepo.SyncCoursesSince(userID, lastSync)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to sync courses"})
		return
	}

	if courses == nil {
		courses = []models.Course{}
	}
	if materials == nil {
		materials = []models.Material{}
	}
	if quizzes == nil {
		quizzes = []models.Quiz{}
	}
	if announcements == nil {
		announcements = []models.Announcement{}
	}

	c.JSON(http.StatusOK, models.SyncResponse{
		Courses:       courses,
		Materials:     materials,
		Quizzes:       quizzes,
		Announcements: announcements,
		Timestamp:     time.Now(),
	})
}

func (h *SyncHandler) SyncMaterialsViewed(c *gin.Context) {
	userID := c.GetInt64("userID")

	var req models.MaterialViewSyncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	synced := 0
	var rejected []int64

	for _, view := range req.Views {
		if view.UserID != userID {
			rejected = append(rejected, view.MaterialID)
			continue
		}

		err := h.courseRepo.SaveMaterialView(view.UserID, view.MaterialID, view.ViewedAt)
		if err != nil {
			rejected = append(rejected, view.MaterialID)
		} else {
			synced++
		}
	}

	c.JSON(http.StatusOK, models.MaterialViewSyncResponse{
		Synced:   synced,
		Rejected: rejected,
	})
}

func (h *SyncHandler) SyncQuizAttempts(c *gin.Context) {
	userID := c.GetInt64("userID")

	var req models.QuizAttemptSyncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	synced := 0
	var conflicts []models.QuizConflictResult
	var rejected []models.QuizRejectResult

	for _, attempt := range req.Attempts {
		if attempt.UserID != userID {
			rejected = append(rejected, models.QuizRejectResult{
				QuizID: attempt.QuizID,
				Reason: "User ID mismatch",
			})
			continue
		}

		existingAttempt, err := h.courseRepo.GetLatestQuizAttempt(userID, attempt.QuizID)
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

		_, err = h.courseRepo.SaveQuizAttempt(userID, quizAttempt)
		if err != nil {
			rejected = append(rejected, models.QuizRejectResult{
				QuizID: attempt.QuizID,
				Reason: err.Error(),
			})
		} else {
			synced++
		}
	}

	c.JSON(http.StatusOK, models.QuizAttemptSyncResponse{
		Synced:    synced,
		Conflicts: conflicts,
		Rejected:  rejected,
	})
}

func (h *SyncHandler) SyncCourse(c *gin.Context) {
	userID := c.GetInt64("userID")
	courseID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	enrolled, err := h.courseRepo.IsEnrolled(userID, courseID)
	if err != nil || !enrolled {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not enrolled in this course"})
		return
	}

	course, err := h.courseRepo.GetByID(courseID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	materials, _ := h.courseRepo.GetMaterials(courseID)
	quizzes, _ := h.courseRepo.GetQuizzes(courseID)
	announcements, _ := h.courseRepo.GetAllAnnouncements(courseID)

	c.JSON(http.StatusOK, gin.H{
		"course":        course,
		"materials":     materials,
		"quizzes":       quizzes,
		"announcements": announcements,
		"timestamp":     time.Now(),
	})
}