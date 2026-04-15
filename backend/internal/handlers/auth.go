package handlers

import (
	"crypto/sha256"
	"elearn-backend/internal/config"
	"elearn-backend/internal/models"
	"elearn-backend/internal/repository"
	"elearn-backend/pkg/auth"
	"encoding/hex"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	userRepo *repository.UserRepository
	cfg      *config.Config
}

func NewAuthHandler(userRepo *repository.UserRepository, cfg *config.Config) *AuthHandler {
	return &AuthHandler{userRepo: userRepo, cfg: cfg}
}

func hashRefreshToken(token string) string {
	digest := sha256.Sum256([]byte(token))
	return hex.EncodeToString(digest[:])
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Role == "" {
		req.Role = "student"
	}
	if req.Role != "student" && req.Role != "lecturer" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Role must be student or lecturer"})
		return
	}

	existingUser, err := h.userRepo.FindByEmail(req.Email)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check existing user"})
		return
	}
	if existingUser != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already registered"})
		return
	}

	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	user, err := h.userRepo.Create(req.Email, passwordHash, req.Name, req.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	accessToken, err := auth.GenerateAccessToken(user.ID, user.Email, user.Role, h.cfg.JWTSecret, h.cfg.JWTExpiry)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate access token"})
		return
	}

	refreshToken, err := auth.GenerateRefreshToken(user.ID, h.cfg.JWTSecret, h.cfg.RefreshExpiry)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
		return
	}

	if err := h.userRepo.SetRefreshTokenHash(user.ID, hashRefreshToken(refreshToken)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to persist refresh token"})
		return
	}

	c.JSON(http.StatusCreated, models.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         *user,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userRepo.FindByEmail(req.Email)
	if err != nil {
		if !errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
			return
		}
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if !auth.CheckPassword(req.Password, user.PasswordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	accessToken, err := auth.GenerateAccessToken(user.ID, user.Email, user.Role, h.cfg.JWTSecret, h.cfg.JWTExpiry)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate access token"})
		return
	}

	refreshToken, err := auth.GenerateRefreshToken(user.ID, h.cfg.JWTSecret, h.cfg.RefreshExpiry)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
		return
	}

	if err := h.userRepo.SetRefreshTokenHash(user.ID, hashRefreshToken(refreshToken)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to persist refresh token"})
		return
	}

	c.JSON(http.StatusOK, models.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         *user,
	})
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req models.RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	claims, err := auth.ValidateRefreshToken(req.RefreshToken, h.cfg.JWTSecret)
	if err != nil {
		if err == auth.ErrExpiredToken {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Refresh token has expired"})
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		}
		return
	}

	user, err := h.userRepo.FindByID(claims.UserID)
	if err != nil {
		if !errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
			return
		}
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	storedTokenHash, err := h.userRepo.GetRefreshTokenHash(user.ID)
	if err != nil {
		if !errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch refresh token state"})
			return
		}
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	if storedTokenHash == "" || storedTokenHash != hashRefreshToken(req.RefreshToken) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		return
	}

	accessToken, err := auth.GenerateAccessToken(user.ID, user.Email, user.Role, h.cfg.JWTSecret, h.cfg.JWTExpiry)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate access token"})
		return
	}

	newRefreshToken, err := auth.GenerateRefreshToken(user.ID, h.cfg.JWTSecret, h.cfg.RefreshExpiry)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
		return
	}

	if err := h.userRepo.SetRefreshTokenHash(user.ID, hashRefreshToken(newRefreshToken)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to rotate refresh token"})
		return
	}

	c.JSON(http.StatusOK, models.RefreshResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	var req models.LogoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	claims, err := auth.ValidateRefreshToken(req.RefreshToken, h.cfg.JWTSecret)
	if err != nil {
		if err == auth.ErrExpiredToken {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Refresh token has expired"})
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		}
		return
	}

	storedTokenHash, err := h.userRepo.GetRefreshTokenHash(claims.UserID)
	if err != nil {
		if !errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch refresh token state"})
			return
		}
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	if storedTokenHash == "" || storedTokenHash != hashRefreshToken(req.RefreshToken) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		return
	}

	if err := h.userRepo.ClearRefreshTokenHash(claims.UserID); err != nil {
		if !errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear refresh token"})
			return
		}
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	userID := c.GetInt64("userID")

	user, err := h.userRepo.FindByID(userID)
	if err != nil {
		if !errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}
