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
	fileRepo := repository.NewPostgresFileRepository(pool)
	fileSvc := service.NewFileService(fileRepo, s3Client)
	fileHandler := handler.NewFileHandler(fileSvc, cfg.MaxUploadSize)

	tagRepo := repository.NewPostgresTagRepository(pool)
	tagSvc := service.NewTagService(tagRepo)

	pageRepo := repository.NewPostgresPageRepository(pool)
	pageSvc := service.NewPageService(pageRepo, tagRepo, fileSvc)
	pageHandler := handler.NewPageHandler(pageSvc)
	tagHandler := handler.NewTagHandler(tagSvc, pageSvc)
	healthHandler := handler.NewHealthHandler(pool)

	// Auth layer
	userRepo := repository.NewPostgresUserRepository(pool)
	authSvc := service.NewAuthService(userRepo, cfg.JWTSecret, cfg.JWTAccessExpiry, cfg.JWTRefreshExpiry)
	authHandler := handler.NewAuthHandler(authSvc)
	authMiddleware := middleware.Auth(authSvc)

	// Router
	router := gin.Default()
	router.Use(middleware.CORS(cfg.AllowedOrigins))

	// Health routes (public)
	router.GET("/healthz", healthHandler.Healthz)
	router.GET("/readyz", healthHandler.Readyz)

	// Auth routes (public)
	router.POST("/api/auth/register", authHandler.Register)
	router.POST("/api/auth/login", authHandler.Login)
	router.POST("/api/auth/refresh", authHandler.Refresh)

	// Protected API routes
	api := router.Group("/api")
	api.Use(authMiddleware)
	{
		api.GET("/pages", pageHandler.ListPages)
		api.GET("/pages/:id", pageHandler.GetPage)
		api.POST("/pages", pageHandler.CreatePage)
		api.PUT("/pages/:id", pageHandler.UpdatePage)
		api.DELETE("/pages/:id", pageHandler.DeletePage)
		api.PATCH("/pages/:id/move", pageHandler.MovePage)
		api.POST("/pages/:id/restore", pageHandler.RestorePage)
		api.POST("/pages/:id/duplicate", pageHandler.DuplicatePage)

		api.GET("/trash", pageHandler.ListTrash)
		api.DELETE("/trash/:id", pageHandler.PermanentDelete)

		api.GET("/tags", tagHandler.ListTags)
		api.POST("/tags", tagHandler.CreateTag)
		api.PUT("/tags/:id", tagHandler.UpdateTag)
		api.DELETE("/tags/:id", tagHandler.DeleteTag)
		api.GET("/tags/:id/pages", tagHandler.ListPagesByTag)

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
