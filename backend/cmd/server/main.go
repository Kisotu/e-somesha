package main

import (
	"elearn-backend/internal/config"
	"elearn-backend/internal/handlers"
	"elearn-backend/internal/middleware"
	"elearn-backend/internal/repository"
	"elearn-backend/pkg/database"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	if runMigrationCommand(cfg) {
		return
	}

	if err := database.Connect(cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName); err != nil {
		log.Printf("Warning: Could not connect to database: %v", err)
		log.Println("Starting in demo mode with mock data...")
		startDemoServer(cfg)
		return
	}
	defer database.Close()

	if err := database.Migrate(database.DB); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	userRepo := repository.NewUserRepository(database.DB)
	courseRepo := repository.NewCourseRepository(database.DB)

	authHandler := handlers.NewAuthHandler(userRepo, cfg)
	courseHandler := handlers.NewCourseHandler(courseRepo)
	syncHandler := handlers.NewSyncHandler(courseRepo)
	adminHandler := handlers.NewAdminHandler(userRepo, courseRepo)

	r := gin.Default()
	r.Use(middleware.CORSMiddleware())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy"})
	})

	window := time.Duration(cfg.RateLimitWindowSeconds) * time.Second

	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", middleware.RateLimitMiddleware(cfg.RegisterRateLimit, window), authHandler.Register)
			auth.POST("/login", middleware.RateLimitMiddleware(cfg.LoginRateLimit, window), authHandler.Login)
			auth.POST("/refresh", middleware.RateLimitMiddleware(cfg.RefreshRateLimit, window), authHandler.Refresh)
			auth.POST("/logout", middleware.RateLimitMiddleware(cfg.RefreshRateLimit, window), authHandler.Logout)
		}

		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(cfg))
		{
			users := protected.Group("/users")
			{
				users.GET("/me", authHandler.GetMe)
			}

			courses := protected.Group("/courses")
			{
				courses.GET("", courseHandler.GetCourses)
				courses.GET("/:id", courseHandler.GetCourse)
				courses.GET("/:id/materials", courseHandler.GetMaterials)
				courses.GET("/:id/quizzes", courseHandler.GetQuizzes)
				courses.GET("/:id/announcements", courseHandler.GetAnnouncements)
				courses.GET("/:id/download_manifest", courseHandler.GetDownloadManifest)
			}

			quizzes := protected.Group("/quizzes")
			{
				quizzes.GET("/:id", courseHandler.GetQuiz)
				quizzes.GET("/:id/questions", courseHandler.GetQuestions)
			}

			sync := protected.Group("/sync")
			sync.Use(middleware.RequestBodyLimitMiddleware(1 << 20))
			{
				sync.GET("/courses", syncHandler.SyncCourses)
				sync.GET("/courses/:id", syncHandler.SyncCourse)
				sync.POST("/materials_viewed", syncHandler.SyncMaterialsViewed)
				sync.POST("/quiz_attempts", syncHandler.SyncQuizAttempts)
			}
		}

		admin := api.Group("/admin")
		admin.Use(middleware.AuthMiddleware(cfg), middleware.AdminMiddleware())
		{
			admin.GET("/stats", adminHandler.GetStats)
			admin.GET("/users", adminHandler.GetUsers)
			admin.PUT("/users/:id", adminHandler.UpdateUser)
			admin.DELETE("/users/:id", adminHandler.DeleteUser)

			admin.GET("/courses", adminHandler.GetCourses)
			admin.POST("/courses", adminHandler.CreateCourse)
			admin.PUT("/courses/:id", adminHandler.UpdateCourse)
			admin.DELETE("/courses/:id", adminHandler.DeleteCourse)

			admin.POST("/enrollments", adminHandler.EnrollUser)
			admin.DELETE("/courses/:id/enrollments/:userId", adminHandler.UnenrollUser)

			admin.POST("/courses/:id/materials", adminHandler.CreateMaterial)
			admin.PUT("/materials/:mid", adminHandler.UpdateMaterial)
			admin.DELETE("/materials/:mid", adminHandler.DeleteMaterial)

			admin.POST("/courses/:id/announcements", adminHandler.CreateAnnouncement)
			admin.PUT("/announcements/:aid", adminHandler.UpdateAnnouncement)
			admin.DELETE("/announcements/:aid", adminHandler.DeleteAnnouncement)

			admin.POST("/courses/:id/quizzes", adminHandler.CreateQuiz)
			admin.PUT("/quizzes/:qid", adminHandler.UpdateQuiz)
			admin.DELETE("/quizzes/:qid", adminHandler.DeleteQuiz)

			admin.POST("/quizzes/:qid/questions", adminHandler.CreateQuestion)
			admin.PUT("/questions/:quesid", adminHandler.UpdateQuestion)
			admin.DELETE("/questions/:quesid", adminHandler.DeleteQuestion)
		}
	}

	log.Printf("Server starting on port %s", cfg.ServerPort)
	if err := r.Run(":" + cfg.ServerPort); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func runMigrationCommand(cfg *config.Config) bool {
	if len(os.Args) < 2 {
		return false
	}

	cmd := os.Args[1]
	if cmd != "migrate:up" && cmd != "migrate:down" {
		return false
	}

	if err := database.Connect(cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName); err != nil {
		log.Fatalf("Failed to connect to database for migration command %s: %v", cmd, err)
	}
	defer database.Close()

	switch cmd {
	case "migrate:up":
		if err := database.Migrate(database.DB); err != nil {
			log.Fatalf("Migration up failed: %v", err)
		}
		log.Println("Migration up completed successfully")
	case "migrate:down":
		if err := database.RollbackLastMigration(database.DB); err != nil {
			log.Fatalf("Migration down failed: %v", err)
		}
		log.Println("Migration down completed successfully")
	}

	return true
}

func startDemoServer(cfg *config.Config) {
	r := gin.Default()
	r.Use(middleware.CORSMiddleware())

	demoUser := gin.H{
		"id":    1,
		"email": "demo@example.com",
		"name":  "Demo User",
		"role":  "student",
	}

	demoCourses := []gin.H{
		{"id": 1, "title": "Introduction to Computer Science", "code": "CS101", "description": "Fundamentals of programming", "lecturer_id": 1, "lecturer_name": "Dr. Jane Smith"},
		{"id": 2, "title": "Data Structures and Algorithms", "code": "CS201", "description": "Advanced data structures", "lecturer_id": 1, "lecturer_name": "Dr. Jane Smith"},
		{"id": 3, "title": "Database Systems", "code": "CS301", "description": "Relational databases and SQL", "lecturer_id": 1, "lecturer_name": "Dr. Jane Smith"},
	}

	demoMaterials := []gin.H{
		{"id": 1, "course_id": 1, "title": "Course Introduction", "type": "pdf", "file_url": "https://api.example.com/files/cs101/intro.pdf"},
		{"id": 2, "course_id": 1, "title": "Week 1: Basics of Programming", "type": "slide", "file_url": "https://api.example.com/files/cs101/week1.pptx"},
	}

	demoQuizzes := []gin.H{
		{"id": 1, "course_id": 1, "title": "Quiz 1: Programming Basics", "description": "Test your knowledge", "time_limit_minutes": 30, "question_count": 5},
	}

	demoAnnouncements := []gin.H{
		{"id": 1, "course_id": 1, "title": "Welcome to CS101", "content": "Welcome to the course!"},
	}

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"mode":    "demo",
			"message": "Running without database - mock responses only",
		})
	})

	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		window := time.Duration(cfg.RateLimitWindowSeconds) * time.Second
		{
			auth.POST("/register", middleware.RateLimitMiddleware(cfg.RegisterRateLimit, window), func(c *gin.Context) {
				c.JSON(http.StatusCreated, gin.H{
					"access_token":  "demo_access_token",
					"refresh_token": "demo_refresh_token",
					"user":          demoUser,
				})
			})
			auth.POST("/login", middleware.RateLimitMiddleware(cfg.LoginRateLimit, window), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{
					"access_token":  "demo_access_token",
					"refresh_token": "demo_refresh_token",
					"user":          demoUser,
				})
			})
			auth.POST("/refresh", middleware.RateLimitMiddleware(cfg.RefreshRateLimit, window), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"access_token": "demo_access_token", "refresh_token": "demo_refresh_token"})
			})
			auth.POST("/logout", middleware.RateLimitMiddleware(cfg.RefreshRateLimit, window), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
			})
		}

		protected := api.Group("")
		protected.Use(func(c *gin.Context) {
			authHeader := c.GetHeader("Authorization")
			if authHeader == "" || authHeader == "Bearer " {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization required"})
				c.Abort()
				return
			}
			c.Set("userID", int64(1))
			c.Set("email", "demo@example.com")
			c.Set("role", "student")
			c.Next()
		})
		{
			users := protected.Group("/users")
			{
				users.GET("/me", func(c *gin.Context) {
					c.JSON(http.StatusOK, demoUser)
				})
			}

			courses := protected.Group("/courses")
			{
				courses.GET("", func(c *gin.Context) {
					c.JSON(http.StatusOK, demoCourses)
				})
				courses.GET("/:id", func(c *gin.Context) {
					id := c.Param("id")
					for _, course := range demoCourses {
						if fmt.Sprintf("%v", course["id"]) == id {
							c.JSON(http.StatusOK, course)
							return
						}
					}
					c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
				})
				courses.GET("/:id/materials", func(c *gin.Context) {
					courseID := c.Param("id")
					var materials []gin.H
					for _, m := range demoMaterials {
						if fmt.Sprintf("%v", m["course_id"]) == courseID {
							materials = append(materials, m)
						}
					}
					c.JSON(http.StatusOK, materials)
				})
				courses.GET("/:id/quizzes", func(c *gin.Context) {
					courseID := c.Param("id")
					var quizzes []gin.H
					for _, q := range demoQuizzes {
						if fmt.Sprintf("%v", q["course_id"]) == courseID {
							quizzes = append(quizzes, q)
						}
					}
					c.JSON(http.StatusOK, quizzes)
				})
				courses.GET("/:id/announcements", func(c *gin.Context) {
					courseID := c.Param("id")
					var announcements []gin.H
					for _, a := range demoAnnouncements {
						if fmt.Sprintf("%v", a["course_id"]) == courseID {
							announcements = append(announcements, a)
						}
					}
					c.JSON(http.StatusOK, announcements)
				})
				courses.GET("/:id/download_manifest", func(c *gin.Context) {
					c.JSON(http.StatusOK, gin.H{
						"course_id":     1,
						"version":       1,
						"files":         demoMaterials,
						"quizzes":       demoQuizzes,
						"announcements": demoAnnouncements,
					})
				})
			}

			quizzes := protected.Group("/quizzes")
			{
				quizzes.GET("/:id", func(c *gin.Context) {
					c.JSON(http.StatusOK, gin.H{
						"quiz": gin.H{
							"id":          1,
							"course_id":   1,
							"title":       "Quiz 1: Programming Basics",
							"description": "Test your knowledge",
						},
						"questions": []gin.H{
							{"id": 1, "quiz_id": 1, "question_text": "What is a variable?", "options": []string{"A container", "A loop", "A function", "A comment"}, "points": 1},
							{"id": 2, "quiz_id": 1, "question_text": "What is 2+2?", "options": []string{"3", "4", "5", "6"}, "points": 1},
						},
					})
				})
			}

			sync := protected.Group("/sync")
			sync.Use(middleware.RequestBodyLimitMiddleware(1 << 20))
			{
				sync.GET("/courses", func(c *gin.Context) {
					c.JSON(http.StatusOK, gin.H{
						"courses":       demoCourses,
						"materials":     demoMaterials,
						"quizzes":       demoQuizzes,
						"announcements": demoAnnouncements,
						"timestamp":     "2026-04-15T00:00:00Z",
					})
				})
				sync.GET("/courses/:id", func(c *gin.Context) {
					c.JSON(http.StatusOK, gin.H{
						"course":        demoCourses[0],
						"materials":     demoMaterials,
						"quizzes":       demoQuizzes,
						"announcements": demoAnnouncements,
						"timestamp":     "2026-04-15T00:00:00Z",
					})
				})
				sync.POST("/materials_viewed", func(c *gin.Context) {
					c.JSON(http.StatusOK, gin.H{"synced": 1, "rejected": []int64{}})
				})
				sync.POST("/quiz_attempts", func(c *gin.Context) {
					c.JSON(http.StatusOK, gin.H{"synced": 1, "conflicts": []gin.H{}, "rejected": []gin.H{}})
				})
			}
		}
	}

	log.Printf("Demo server starting on port %s", cfg.ServerPort)
	if err := r.Run(":" + cfg.ServerPort); err != nil {
		log.Fatalf("Failed to start demo server: %v", err)
	}
}
