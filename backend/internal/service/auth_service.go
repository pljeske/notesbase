package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"notesbase/backend/internal/model"
	"notesbase/backend/internal/repository"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	repo          repository.UserRepository
	resetRepo     repository.PasswordResetRepository
	emailSvc      *EmailService
	appURL        string
	jwtSecret     []byte
	accessExpiry  time.Duration
	refreshExpiry time.Duration
}

func NewAuthService(
	repo repository.UserRepository,
	resetRepo repository.PasswordResetRepository,
	emailSvc *EmailService,
	appURL string,
	secret string,
	accessExpiry, refreshExpiry time.Duration,
) *AuthService {
	return &AuthService{
		repo:          repo,
		resetRepo:     resetRepo,
		emailSvc:      emailSvc,
		appURL:        appURL,
		jwtSecret:     []byte(secret),
		accessExpiry:  accessExpiry,
		refreshExpiry: refreshExpiry,
	}
}

func (s *AuthService) Register(ctx context.Context, req model.RegisterRequest) (*model.AuthResponse, error) {
	existing, err := s.repo.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("check existing user: %w", err)
	}
	if existing != nil {
		return nil, fmt.Errorf("email already registered")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	// First user to register becomes admin.
	role := "user"
	count, err := s.repo.Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("count users: %w", err)
	}
	if count == 0 {
		role = "admin"
	}

	saltBytes := make([]byte, 16)
	if _, err := rand.Read(saltBytes); err != nil {
		return nil, fmt.Errorf("generate encryption salt: %w", err)
	}

	user := &model.User{
		Email:          req.Email,
		PasswordHash:   string(hash),
		Name:           req.Name,
		Role:           role,
		EncryptionSalt: hex.EncodeToString(saltBytes),
	}

	if err := s.repo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	accessToken, refreshToken, err := s.generateTokenPair(user.ID, user.Role)
	if err != nil {
		return nil, err
	}

	return &model.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User: model.UserInfo{
			ID:             user.ID,
			Email:          user.Email,
			Name:           user.Name,
			Role:           user.Role,
			EncryptionSalt: user.EncryptionSalt,
		},
	}, nil
}

func (s *AuthService) Login(ctx context.Context, req model.LoginRequest) (*model.AuthResponse, error) {
	user, err := s.repo.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("find user: %w", err)
	}
	if user == nil {
		return nil, fmt.Errorf("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, fmt.Errorf("invalid email or password")
	}

	if user.DisabledAt != nil {
		return nil, fmt.Errorf("account disabled")
	}

	accessToken, refreshToken, err := s.generateTokenPair(user.ID, user.Role)
	if err != nil {
		return nil, err
	}

	return &model.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User: model.UserInfo{
			ID:             user.ID,
			Email:          user.Email,
			Name:           user.Name,
			Role:           user.Role,
			EncryptionSalt: user.EncryptionSalt,
		},
	}, nil
}

func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*model.AuthResponse, error) {
	userID, tokenType, _, err := s.parseToken(refreshToken)
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token: %w", err)
	}
	if tokenType != "refresh" {
		return nil, fmt.Errorf("invalid token type")
	}

	user, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("find user: %w", err)
	}
	if user == nil {
		return nil, fmt.Errorf("user not found")
	}
	if user.DisabledAt != nil {
		return nil, fmt.Errorf("account disabled")
	}

	accessToken, newRefreshToken, err := s.generateTokenPair(user.ID, user.Role)
	if err != nil {
		return nil, err
	}

	return &model.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		User: model.UserInfo{
			ID:             user.ID,
			Email:          user.Email,
			Name:           user.Name,
			Role:           user.Role,
			EncryptionSalt: user.EncryptionSalt,
		},
	}, nil
}

func (s *AuthService) ValidateToken(tokenStr string) (uuid.UUID, string, error) {
	userID, tokenType, role, err := s.parseToken(tokenStr)
	if err != nil {
		return uuid.Nil, "", err
	}
	if tokenType != "access" {
		return uuid.Nil, "", fmt.Errorf("invalid token type")
	}
	return userID, role, nil
}

// RequestPasswordReset generates a reset token and emails it.
// Always returns nil to avoid leaking whether an email is registered.
func (s *AuthService) RequestPasswordReset(ctx context.Context, email string) error {
	user, err := s.repo.GetByEmail(ctx, email)
	if err != nil || user == nil {
		return nil
	}

	// Invalidate any existing tokens for this user.
	_ = s.resetRepo.DeleteByUserID(ctx, user.ID)

	// Generate a 32-byte cryptographically random token.
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return fmt.Errorf("generate token: %w", err)
	}
	token := hex.EncodeToString(raw)
	hash := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(hash[:])

	expiresAt := time.Now().Add(time.Hour)
	if err := s.resetRepo.Create(ctx, user.ID, tokenHash, expiresAt); err != nil {
		return fmt.Errorf("store reset token: %w", err)
	}

	resetURL := fmt.Sprintf("%s/reset-password?token=%s", s.appURL, token)
	return s.emailSvc.SendPasswordReset(user.Email, user.Name, resetURL)
}

// ResetPassword validates the token and updates the user's password.
// The token is consumed (deleted) before the password is updated to prevent
// TOCTOU: if two concurrent requests race, only the first to delete the token wins.
func (s *AuthService) ResetPassword(ctx context.Context, token, newPassword string) error {
	hash := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(hash[:])

	record, err := s.resetRepo.GetByTokenHash(ctx, tokenHash)
	if err != nil {
		return fmt.Errorf("lookup token: %w", err)
	}
	if record == nil || time.Now().After(record.ExpiresAt) {
		return fmt.Errorf("invalid or expired token")
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}

	// Consume the token atomically before updating the password.
	// DeleteByTokenHash returns an error if the token was already consumed by a
	// concurrent request, ensuring each token can only be used once.
	if err := s.resetRepo.DeleteByTokenHash(ctx, tokenHash); err != nil {
		return fmt.Errorf("invalid or expired token")
	}

	return s.repo.UpdatePassword(ctx, record.UserID, string(passwordHash))
}

func (s *AuthService) generateTokenPair(userID uuid.UUID, role string) (string, string, error) {
	now := time.Now()

	accessClaims := jwt.MapClaims{
		"sub":  userID.String(),
		"type": "access",
		"role": role,
		"iat":  now.Unix(),
		"exp":  now.Add(s.accessExpiry).Unix(),
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessStr, err := accessToken.SignedString(s.jwtSecret)
	if err != nil {
		return "", "", fmt.Errorf("sign access token: %w", err)
	}

	refreshClaims := jwt.MapClaims{
		"sub":  userID.String(),
		"type": "refresh",
		"iat":  now.Unix(),
		"exp":  now.Add(s.refreshExpiry).Unix(),
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshStr, err := refreshToken.SignedString(s.jwtSecret)
	if err != nil {
		return "", "", fmt.Errorf("sign refresh token: %w", err)
	}

	return accessStr, refreshStr, nil
}

func (s *AuthService) parseToken(tokenStr string) (uuid.UUID, string, string, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return uuid.Nil, "", "", err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return uuid.Nil, "", "", fmt.Errorf("invalid token claims")
	}

	sub, ok := claims["sub"].(string)
	if !ok {
		return uuid.Nil, "", "", fmt.Errorf("missing sub claim")
	}
	userID, err := uuid.Parse(sub)
	if err != nil {
		return uuid.Nil, "", "", fmt.Errorf("invalid user id in token")
	}

	tokenType, _ := claims["type"].(string)
	role, _ := claims["role"].(string)

	return userID, tokenType, role, nil
}
