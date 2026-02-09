package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"notes-app/backend/internal/config"
	"notes-app/backend/internal/database"
	"notes-app/backend/internal/handler"
	"notes-app/backend/internal/middleware"
	"notes-app/backend/internal/repository"
	"notes-app/backend/internal/service"
	"notes-app/backend/internal/storage"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	ctx := context.Background()

	// Database
	pool, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	// Run migrations
	if err := database.RunMigrations(cfg.DatabaseURL); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}
	log.Println("Migrations completed successfully")

	// S3 Storage
	s3Client, err := storage.NewS3Client(
		cfg.MinioEndpoint,
		cfg.MinioAccessKey,
		cfg.MinioSecretKey,
		cfg.MinioBucket,
		cfg.MinioUseSSL,
	)
	if err != nil {
		log.Fatalf("Failed to create S3 client: %v", err)
	}
	if err := s3Client.EnsureBucket(ctx); err != nil {
		log.Fatalf("Failed to ensure S3 bucket: %v", err)
	}
	log.Println("S3 storage ready")

	// Wire up layers
	pageRepo := repository.NewPostgresPageRepository(pool)
	pageSvc := service.NewPageService(pageRepo)
	pageHandler := handler.NewPageHandler(pageSvc)
	healthHandler := handler.NewHealthHandler(pool)

	fileRepo := repository.NewPostgresFileRepository(pool)
	fileSvc := service.NewFileService(fileRepo, s3Client)
	fileHandler := handler.NewFileHandler(fileSvc, cfg.MaxUploadSize)

	// Router
	router := gin.Default()
	router.Use(middleware.CORS(cfg.AllowedOrigins))

	// Health routes
	router.GET("/healthz", healthHandler.Healthz)
	router.GET("/readyz", healthHandler.Readyz)

	// API routes
	api := router.Group("/api")
	{
		api.GET("/pages", pageHandler.ListPages)
		api.GET("/pages/:id", pageHandler.GetPage)
		api.POST("/pages", pageHandler.CreatePage)
		api.PUT("/pages/:id", pageHandler.UpdatePage)
		api.DELETE("/pages/:id", pageHandler.DeletePage)
		api.PATCH("/pages/:id/move", pageHandler.MovePage)

		api.POST("/upload", fileHandler.Upload)
		api.GET("/files/:id", fileHandler.GetFile)
		api.DELETE("/files/:id", fileHandler.DeleteFile)
	}

	// Start server
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: router,
	}

	go func() {
		log.Printf("Server starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exited")
}
