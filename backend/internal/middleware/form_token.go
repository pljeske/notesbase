package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// FormToken issues and validates time-bounded HMAC tokens for form submissions.
// A token is generated when the client loads /api/config and must be included
// in the registration request. The backend enforces:
//   - Authenticity: HMAC matches (can't be forged without the server secret)
//   - Minimum age >= 3 s (rejects instant-submit bots)
//   - Maximum age <= 1 h (rejects replayed tokens)
type FormToken struct {
	secret []byte
	MinAge time.Duration
	MaxAge time.Duration
}

// NewFormToken creates a FormToken using the given secret (typically JWT_SECRET).
func NewFormToken(secret string) *FormToken {
	return &FormToken{
		secret: []byte(secret),
		MinAge: 3 * time.Second,
		MaxAge: time.Hour,
	}
}

// Generate returns a new token encoding the current Unix timestamp as
// "<unix_ts>.<hmac_sha256_hex>".
func (f *FormToken) Generate() string {
	ts := strconv.FormatInt(time.Now().Unix(), 10)
	mac := hmac.New(sha256.New, f.secret)
	mac.Write([]byte(ts))
	sig := hex.EncodeToString(mac.Sum(nil))
	return ts + "." + sig
}

// Validate checks that token is authentic and within the allowed age window.
func (f *FormToken) Validate(token string) error {
	parts := strings.SplitN(token, ".", 2)
	if len(parts) != 2 {
		return fmt.Errorf("malformed token")
	}
	tsStr, sig := parts[0], parts[1]

	ts, err := strconv.ParseInt(tsStr, 10, 64)
	if err != nil {
		return fmt.Errorf("malformed token")
	}

	mac := hmac.New(sha256.New, f.secret)
	mac.Write([]byte(tsStr))
	expected := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(sig), []byte(expected)) {
		return fmt.Errorf("invalid token")
	}

	age := time.Since(time.Unix(ts, 0))
	if age < f.MinAge {
		return fmt.Errorf("form submitted too quickly")
	}
	if age > f.MaxAge {
		return fmt.Errorf("token expired")
	}
	return nil
}
