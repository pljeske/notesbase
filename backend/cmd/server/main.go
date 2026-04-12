package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"notesbase/backend/internal/config"
	"notesbase/backend/internal/database"
	"notesbase/backend/internal/handler"
	"notesbase/backend/internal/middleware"
	"notesbase/backend/internal/model"
	"notesbase/backend/internal/repository"
	"notesbase/backend/internal/service"
	"notesbase/backend/internal/storage"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

func main() {
	log.Printf("notesbase %s (%s)", version, commit)

	cfg := config.Load()

	if cfg.JWTSecret == "" || cfg.JWTSecret == "change-me-in-production" {
		log.Fatal("JWT_SECRET environment variable must be set to a strong random value (e.g. openssl rand -hex 32)")
	}

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
	pageLinkRepo := repository.NewPostgresPageLinkRepository(pool)
	pageSvc := service.NewPageService(pageRepo, tagRepo, fileSvc, pageLinkRepo)
	pageHandler := handler.NewPageHandler(pageSvc)
	tagHandler := handler.NewTagHandler(tagSvc, pageSvc)
	healthHandler := handler.NewHealthHandler(pool)

	// Auth & settings layer
	userRepo := repository.NewPostgresUserRepository(pool)
	settingsRepo := repository.NewPostgresSettingsRepository(pool)
	resetRepo := repository.NewPostgresPasswordResetRepository(pool)

	// Seed registration_enabled from env var (only if not yet set in DB).
	seedRegistrationSetting(ctx, settingsRepo, cfg.RegistrationDisabled)

	// Ensure at least one admin exists (promotes oldest user after migration).
	ensureAdminExists(ctx, userRepo)

	revokedRepo := repository.NewPostgresRevokedTokenRepository(pool)
	revokedRepo.StartCleanup(ctx)

	emailSvc := service.NewEmailService(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUsername, cfg.SMTPPassword, cfg.SMTPFrom)
	authSvc := service.NewAuthService(userRepo, resetRepo, revokedRepo, emailSvc, cfg.AppURL, cfg.JWTSecret, cfg.JWTAccessExpiry, cfg.JWTRefreshExpiry)
	formToken := middleware.NewFormToken(cfg.JWTSecret)
	authHandler := handler.NewAuthHandler(authSvc, settingsRepo, formToken)
	adminHandler := handler.NewAdminHandler(userRepo, settingsRepo)
	authMiddleware := middleware.Auth(authSvc)

	apiKeyRepo := repository.NewPostgresAPIKeyRepository(pool)
	apiKeyHandler := handler.NewAPIKeyHandler(apiKeyRepo)
	apiKeyMiddleware := middleware.APIKeyAuth(apiKeyRepo)

	// Router
	router := gin.Default()
	router.Use(middleware.CORS(cfg.AllowedOrigins))

	// Health routes (public)
	router.GET("/healthz", healthHandler.Healthz)
	router.GET("/readyz", healthHandler.Readyz)

	// Auth routes (public)
	// Tiered rate limits on credential and account-recovery endpoints.
	// login:    ~10/min (burst 5)  — users legitimately retry passwords
	// register: ~3/min  (burst 2)  — account creation needs a tighter ceiling
	// reset:    ~5/min  (burst 3)  — password-reset flow
	loginLimiter := middleware.RateLimit(rate.Every(6*time.Second), 5)     // ~10/min
	registerLimiter := middleware.RateLimit(rate.Every(20*time.Second), 2) // ~3/min
	resetLimiter := middleware.RateLimit(rate.Every(12*time.Second), 3)    // ~5/min

	router.GET("/api/config", authHandler.GetConfig)
	router.POST("/api/auth/register", registerLimiter, authHandler.Register)
	router.POST("/api/auth/login", loginLimiter, authHandler.Login)
	router.POST("/api/auth/refresh", authHandler.Refresh)
	router.POST("/api/auth/logout", authHandler.Logout)
	router.POST("/api/auth/forgot-password", resetLimiter, authHandler.ForgotPassword)
	router.POST("/api/auth/reset-password", resetLimiter, authHandler.ResetPassword)

	// Protected API routes
	api := router.Group("/api")
	api.Use(authMiddleware)
	{
		api.GET("/pages", pageHandler.ListPages)
		api.GET("/pages/search", pageHandler.SearchPages)
		api.GET("/pages/:id", pageHandler.GetPage)
		api.POST("/pages", pageHandler.CreatePage)
		api.PUT("/pages/:id", pageHandler.UpdatePage)
		api.DELETE("/pages/:id", pageHandler.DeletePage)
		api.PATCH("/pages/:id/move", pageHandler.MovePage)
		api.POST("/pages/:id/restore", pageHandler.RestorePage)
		api.POST("/pages/:id/duplicate", pageHandler.DuplicatePage)
		api.GET("/pages/:id/backlinks", pageHandler.GetBacklinks)

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

		// Admin routes — require admin role
		admin := api.Group("/admin")
		admin.Use(middleware.RequireAdmin)
		{
			admin.GET("/users", adminHandler.ListUsers)
			admin.PUT("/users/:id/role", adminHandler.UpdateUserRole)
			admin.PUT("/users/:id/disabled", adminHandler.SetUserDisabled)
			admin.GET("/settings", adminHandler.GetSettings)
			admin.PUT("/settings", adminHandler.UpdateSettings)
		}

		// API key management (JWT-authenticated, for the settings UI)
		api.GET("/api-keys", apiKeyHandler.ListKeys)
		api.POST("/api-keys", apiKeyHandler.CreateKey)
		api.DELETE("/api-keys/:id", apiKeyHandler.DeleteKey)
	}

	// Plugin API routes — authenticated by API key, not JWT
	plugin := router.Group("/api/v1/plugin")
	plugin.Use(apiKeyMiddleware)
	{
		plugin.GET("/pages", middleware.RequireScope(model.ScopePageRead), pageHandler.ListPages)
		plugin.GET("/pages/search", middleware.RequireScope(model.ScopePageRead), pageHandler.SearchPages)
		plugin.GET("/pages/:id", middleware.RequireScope(model.ScopePageRead), pageHandler.GetPage)
		plugin.GET("/pages/:id/backlinks", middleware.RequireScope(model.ScopePageRead), pageHandler.GetBacklinks)
		plugin.POST("/pages", middleware.RequireScope(model.ScopePageWrite), pageHandler.CreatePage)
		plugin.PUT("/pages/:id", middleware.RequireScope(model.ScopePageWrite), pageHandler.UpdatePage)
		plugin.PATCH("/pages/:id/move", middleware.RequireScope(model.ScopePageWrite), pageHandler.MovePage)

		plugin.GET("/tags", middleware.RequireScope(model.ScopeTagRead), tagHandler.ListTags)
		plugin.GET("/tags/:id/pages", middleware.RequireScope(model.ScopeTagRead), tagHandler.ListPagesByTag)
		plugin.POST("/tags", middleware.RequireScope(model.ScopeTagWrite), tagHandler.CreateTag)
		plugin.PUT("/tags/:id", middleware.RequireScope(model.ScopeTagWrite), tagHandler.UpdateTag)
		plugin.DELETE("/tags/:id", middleware.RequireScope(model.ScopeTagWrite), tagHandler.DeleteTag)

		plugin.GET("/files/:id", middleware.RequireScope(model.ScopeFileRead), fileHandler.GetFile)
		plugin.POST("/upload", middleware.RequireScope(model.ScopeFileWrite), fileHandler.Upload)
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

// seedRegistrationSetting sets registration_enabled in DB from the env var,
// but only if the key hasn't been set yet (preserves admin overrides across restarts).
func seedRegistrationSetting(ctx context.Context, repo repository.SettingsRepository, registrationDisabled bool) {
	_, found, err := repo.Get(ctx, "registration_enabled")
	if err != nil {
		log.Printf("Warning: could not check registration setting: %v", err)
		return
	}
	if found {
		return // already set, don't overwrite
	}
	value := "true"
	if registrationDisabled {
		value = "false"
	}
	if err := repo.Set(ctx, "registration_enabled", value); err != nil {
		log.Printf("Warning: could not seed registration setting: %v", err)
	}
}

// ensureAdminExists promotes the oldest user to admin if no admin currently exists.
// This handles the migration case where existing users have role='user'.
func ensureAdminExists(ctx context.Context, repo repository.UserRepository) {
	users, err := repo.ListAll(ctx)
	if err != nil {
		log.Printf("Warning: could not check for admins: %v", err)
		return
	}
	for _, u := range users {
		if u.Role == "admin" {
			return
		}
	}
	if len(users) == 0 {
		return
	}
	// Promote the oldest user.
	if err := repo.UpdateRole(ctx, users[0].ID, "admin"); err != nil {
		log.Printf("Warning: could not promote user to admin: %v", err)
		return
	}
	log.Printf("Promoted user %s (%s) to admin", users[0].Name, users[0].Email)
}
