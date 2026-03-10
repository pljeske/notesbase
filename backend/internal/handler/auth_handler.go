package handler

import (
	"net/http"

	"notes-app/backend/internal/model"
	"notes-app/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	service              *service.AuthService
	registrationDisabled bool
}

func NewAuthHandler(s *service.AuthService, registrationDisabled bool) *AuthHandler {
	return &AuthHandler{service: s, registrationDisabled: registrationDisabled}
}

func (h *AuthHandler) GetConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"registration_enabled": !h.registrationDisabled})
}

func (h *AuthHandler) Register(c *gin.Context) {
	if h.registrationDisabled {
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
		// Check for duplicate email
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
