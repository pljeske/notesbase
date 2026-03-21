package handler

import (
	"net/http"
	"strings"

	"notesbase/backend/internal/middleware"
	"notesbase/backend/internal/model"
	"notesbase/backend/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type PageHandler struct {
	service *service.PageService
}

func NewPageHandler(s *service.PageService) *PageHandler {
	return &PageHandler{service: s}
}

func (h *PageHandler) SearchPages(c *gin.Context) {
	userID := middleware.GetUserID(c)
	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		c.JSON(http.StatusOK, []model.SearchResult{})
		return
	}

	results, err := h.service.SearchPages(c.Request.Context(), userID, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, results)
}

func (h *PageHandler) ListPages(c *gin.Context) {
	userID := middleware.GetUserID(c)
	tree, err := h.service.GetTree(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tree)
}

func (h *PageHandler) GetPage(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page id"})
		return
	}

	page, err := h.service.GetPage(c.Request.Context(), userID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if page == nil {
		trashed, _ := h.service.IsPageTrashed(c.Request.Context(), userID, id)
		if trashed {
			c.JSON(http.StatusNotFound, gin.H{"error": "page is in trash"})
		} else {
			c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
		}
		return
	}

	c.JSON(http.StatusOK, page)
}

func (h *PageHandler) CreatePage(c *gin.Context) {
	userID := middleware.GetUserID(c)
	var req model.CreatePageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Allow empty body - create with defaults
		req = model.CreatePageRequest{}
	}

	page, err := h.service.CreatePage(c.Request.Context(), userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, page)
}

func (h *PageHandler) UpdatePage(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page id"})
		return
	}

	var req model.UpdatePageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	page, err := h.service.UpdatePage(c.Request.Context(), userID, id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if page == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "page not found"})
		return
	}

	c.JSON(http.StatusOK, page)
}

func (h *PageHandler) DeletePage(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page id"})
		return
	}

	if err := h.service.DeletePage(c.Request.Context(), userID, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *PageHandler) MovePage(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page id"})
		return
	}

	var req model.MovePageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.MovePage(c.Request.Context(), userID, id, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *PageHandler) ListTrash(c *gin.Context) {
	userID := middleware.GetUserID(c)
	pages, err := h.service.ListTrash(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if pages == nil {
		pages = []model.TrashedPage{}
	}
	c.JSON(http.StatusOK, pages)
}

func (h *PageHandler) RestorePage(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page id"})
		return
	}

	if err := h.service.RestorePage(c.Request.Context(), userID, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *PageHandler) PermanentDelete(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page id"})
		return
	}

	if err := h.service.PermanentDeletePage(c.Request.Context(), userID, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *PageHandler) GetBacklinks(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page id"})
		return
	}
	results, err := h.service.GetBacklinks(c.Request.Context(), userID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, results)
}

func (h *PageHandler) DuplicatePage(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page id"})
		return
	}

	var req model.DuplicatePageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		req = model.DuplicatePageRequest{}
	}

	page, err := h.service.DuplicatePage(c.Request.Context(), userID, id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, page)
}
