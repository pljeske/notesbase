package handler

import (
	"net/http"

	"notesbase/backend/internal/model"
	"notesbase/backend/internal/repository"
	"notesbase/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	service      *service.AuthService
	settingsRepo repository.SettingsRepository
}

func NewAuthHandler(s *service.AuthService, settingsRepo repository.SettingsRepository) *AuthHandler {
	return &AuthHandler{service: s, settingsRepo: settingsRepo}
}

func (h *AuthHandler) registrationEnabled(c *gin.Context) bool {
	val, found, err := h.settingsRepo.Get(c.Request.Context(), "registration_enabled")
	if err != nil || !found {
		return true // default: allow registration
	}
	return val == "true"
}

func (h *AuthHandler) GetConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"registration_enabled": h.registrationEnabled(c)})
}

func (h *AuthHandler) Register(c *gin.Context) {
	if !h.registrationEnabled(c) {
		c.JSON(http.StatusForbidden, gin.H{"error": "registration is disabled"})
		return
	}

	var req model.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.service.Register(c.Request.Context(), req)
	if err != nil {
		if err.Error() == "email already registered" {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, resp)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req model.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.service.Login(c.Request.Context(), req)
	if err != nil {
		if err.Error() == "account disabled" {
			c.JSON(http.StatusForbidden, gin.H{"error": "your account has been disabled"})
			return
		}
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req refreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.service.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid refresh token"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req model.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Always return 200 — never reveal whether the email is registered.
	_ = h.service.RequestPasswordReset(c.Request.Context(), req.Email)
	c.JSON(http.StatusOK, gin.H{"message": "If that email is registered, a reset link has been sent."})
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req model.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.ResetPassword(c.Request.Context(), req.Token, req.Password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired reset link."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully."})
}

type logoutRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func (h *AuthHandler) Logout(c *gin.Context) {
	// Extract the access token from the Authorization header.
	accessToken := ""
	if header := c.GetHeader("Authorization"); len(header) > 7 {
		accessToken = header[7:] // strip "Bearer "
	}

	var req logoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.service.Logout(c.Request.Context(), accessToken, req.RefreshToken)
	c.Status(http.StatusNoContent)
}
