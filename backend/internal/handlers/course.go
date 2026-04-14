package handlers

import (
	"elearn-backend/internal/models"
	"elearn-backend/internal/repository"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type CourseHandler struct {
	courseRepo *repository.CourseRepository
}

func NewCourseHandler(courseRepo *repository.CourseRepository) *CourseHandler {
	return &CourseHandler{courseRepo: courseRepo}
}

func (h *CourseHandler) GetCourses(c *gin.Context) {
	userID := c.GetInt64("userID")

	courses, err := h.courseRepo.GetEnrolledCourses(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch courses"})
		return
	}

	if courses == nil {
		courses = []models.Course{}
	}

	c.JSON(http.StatusOK, courses)
}

func (h *CourseHandler) GetCourse(c *gin.Context) {
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

	c.JSON(http.StatusOK, course)
}

func (h *CourseHandler) GetMaterials(c *gin.Context) {
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

	materials, err := h.courseRepo.GetMaterials(courseID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch materials"})
		return
	}

	if materials == nil {
		materials = []models.Material{}
	}

	c.JSON(http.StatusOK, materials)
}

func (h *CourseHandler) GetQuizzes(c *gin.Context) {
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

	quizzes, err := h.courseRepo.GetQuizzes(courseID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch quizzes"})
		return
	}

	if quizzes == nil {
		quizzes = []models.Quiz{}
	}

	c.JSON(http.StatusOK, quizzes)
}

func (h *CourseHandler) GetQuiz(c *gin.Context) {
	userID := c.GetInt64("userID")
	quizID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid quiz ID"})
		return
	}

	quiz, err := h.courseRepo.GetQuizByID(quizID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quiz not found"})
		return
	}

	enrolled, err := h.courseRepo.IsEnrolled(userID, quiz.CourseID)
	if err != nil || !enrolled {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not enrolled in this course"})
		return
	}

	questions, err := h.courseRepo.GetQuizQuestions(quizID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch questions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"quiz":      quiz,
		"questions": questions,
	})
}

func (h *CourseHandler) GetAnnouncements(c *gin.Context) {
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

	announcements, err := h.courseRepo.GetAllAnnouncements(courseID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch announcements"})
		return
	}

	if announcements == nil {
		announcements = []models.Announcement{}
	}

	c.JSON(http.StatusOK, announcements)
}

func (h *CourseHandler) GetDownloadManifest(c *gin.Context) {
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

	manifest, err := h.courseRepo.GetDownloadManifest(courseID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Download manifest not found"})
		return
	}

	materials, _ := h.courseRepo.GetMaterials(courseID)
	quizzes, _ := h.courseRepo.GetQuizzes(courseID)
	announcements, _ := h.courseRepo.GetAnnouncements(courseID, time.Now().AddDate(0, 0, -30))

	c.JSON(http.StatusOK, models.DownloadManifestResponse{
		CourseID:      manifest.CourseID,
		Version:       manifest.Version,
		Files:         toManifestFiles(materials),
		Quizzes:       quizzes,
		Announcements: announcements,
	})
}

func toManifestFiles(materials []models.Material) []models.DownloadManifestFile {
	files := make([]models.DownloadManifestFile, len(materials))
	for i, m := range materials {
		files[i] = models.DownloadManifestFile{
			MaterialID: m.ID,
			Title:      m.Title,
			Type:       m.Type,
			URL:        m.FileURL,
			FileSize:   m.FileSize,
			Checksum:   m.Checksum,
		}
	}
	return files
}