package handler

import (
	"net/http"

	"notesbase/backend/internal/middleware"
	"notesbase/backend/internal/model"
	"notesbase/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AdminHandler struct {
	userRepo     repository.UserRepository
	settingsRepo repository.SettingsRepository
}

func NewAdminHandler(userRepo repository.UserRepository, settingsRepo repository.SettingsRepository) *AdminHandler {
	return &AdminHandler{userRepo: userRepo, settingsRepo: settingsRepo}
}

func (h *AdminHandler) ListUsers(c *gin.Context) {
	users, err := h.userRepo.ListAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list users"})
		return
	}

	result := make([]model.AdminUserInfo, len(users))
	for i, u := range users {
		result[i] = model.AdminUserInfo{
			ID:        u.ID,
			Email:     u.Email,
			Name:      u.Name,
			Role:      u.Role,
			Disabled:  u.DisabledAt != nil,
			CreatedAt: u.CreatedAt,
		}
	}
	c.JSON(http.StatusOK, result)
}

func (h *AdminHandler) UpdateUserRole(c *gin.Context) {
	targetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	requestingUserID := middleware.GetUserID(c)
	if requestingUserID == targetID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot change your own role"})
		return
	}

	var req model.UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Role != "admin" && req.Role != "user" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "role must be 'admin' or 'user'"})
		return
	}

	// UpdateRoleChecked atomically prevents demoting the last admin.
	updated, err := h.userRepo.UpdateRoleChecked(c.Request.Context(), targetID, req.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update role"})
		return
	}
	if !updated {
		if req.Role == "user" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "cannot demote the last admin"})
		} else {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "role updated"})
}

func (h *AdminHandler) SetUserDisabled(c *gin.Context) {
	targetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	requestingUserID := middleware.GetUserID(c)
	if requestingUserID == targetID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot disable your own account"})
		return
	}

	var req model.SetDisabledRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.userRepo.SetDisabled(c.Request.Context(), targetID, req.Disabled); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "user updated"})
}

func (h *AdminHandler) GetSettings(c *gin.Context) {
	regEnabled, _, _ := h.settingsRepo.Get(c.Request.Context(), "registration_enabled")
	c.JSON(http.StatusOK, gin.H{
		"registration_enabled": regEnabled != "false",
	})
}

func (h *AdminHandler) UpdateSettings(c *gin.Context) {
	var req model.UpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	value := "false"
	if req.RegistrationEnabled {
		value = "true"
	}
	if err := h.settingsRepo.Set(c.Request.Context(), "registration_enabled", value); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update settings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"registration_enabled": req.RegistrationEnabled})
}
