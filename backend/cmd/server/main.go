package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/gin-gonic/gin"
	"notes-app/backend/internal/config"
	"notes-app/backend/internal/database"
	"notes-app/backend/internal/handler"
	"notes-app/backend/internal/middleware"
	"notes-app/backend/internal/repository"
	"notes-app/backend/internal/service"
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

	// Wire up layers
	repo := repository.NewPostgresPageRepository(pool)
	svc := service.NewPageService(repo)
	pageHandler := handler.NewPageHandler(svc)
	healthHandler := handler.NewHealthHandler(pool)

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
