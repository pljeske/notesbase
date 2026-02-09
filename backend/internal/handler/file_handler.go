package handler

import (
	"io"
	"net/http"
	"strconv"

	"notes-app/backend/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type FileHandler struct {
	service       *service.FileService
	maxUploadSize int64
}

func NewFileHandler(s *service.FileService, maxUploadSize int64) *FileHandler {
	return &FileHandler{service: s, maxUploadSize: maxUploadSize}
}

func (h *FileHandler) Upload(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, h.maxUploadSize)

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required: " + err.Error()})
		return
	}
	defer file.Close()

	pageIDStr := c.Request.FormValue("page_id")
	pageID, err := uuid.Parse(pageIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page_id"})
		return
	}

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	resp, err := h.service.Upload(
		c.Request.Context(),
		pageID,
		header.Filename,
		contentType,
		header.Size,
		file,
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, resp)
}

func (h *FileHandler) GetFile(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file id"})
		return
	}

	fileMeta, reader, err := h.service.GetFile(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if fileMeta == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}
	defer reader.Close()

	c.Header("Content-Type", fileMeta.ContentType)
	c.Header("Content-Length", strconv.FormatInt(fileMeta.Size, 10))
	c.Header("Content-Disposition", "inline; filename=\""+fileMeta.Filename+"\"")
	c.Header("Cache-Control", "public, max-age=31536000, immutable")

	c.Status(http.StatusOK)
	io.Copy(c.Writer, reader)
}

func (h *FileHandler) DeleteFile(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file id"})
		return
	}

	if err := h.service.DeleteFile(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}
