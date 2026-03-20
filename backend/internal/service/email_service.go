package service

import (
	"fmt"
	"net/smtp"
	"strings"
)

type EmailService struct {
	host     string
	port     string
	username string
	password string
	from     string
}

func NewEmailService(host, port, username, password, from string) *EmailService {
	return &EmailService{host: host, port: port, username: username, password: password, from: from}
}

// Enabled reports whether SMTP is configured. If false, emails are logged but not sent.
func (s *EmailService) Enabled() bool {
	return s.host != ""
}

func (s *EmailService) SendPasswordReset(toEmail, toName, resetURL string) error {
	subject := "Reset your notesbase password"
	body := fmt.Sprintf(`Hi %s,

Someone requested a password reset for your notesbase account.

Click the link below to set a new password (valid for 1 hour):

  %s

If you didn't request this, you can safely ignore this email.

— notesbase
`, toName, resetURL)

	if !s.Enabled() {
		// Log to stdout when SMTP is not configured (useful for dev).
		fmt.Printf("[email] To: %s | Subject: %s\n%s\n", toEmail, subject, body)
		return nil
	}

	msg := buildMessage(s.from, toEmail, subject, body)
	addr := s.host + ":" + s.port
	auth := smtp.PlainAuth("", s.username, s.password, s.host)
	if err := smtp.SendMail(addr, auth, s.from, []string{toEmail}, []byte(msg)); err != nil {
		return fmt.Errorf("send email: %w", err)
	}
	return nil
}

func buildMessage(from, to, subject, body string) string {
	var b strings.Builder
	b.WriteString("From: " + from + "\r\n")
	b.WriteString("To: " + to + "\r\n")
	b.WriteString("Subject: " + subject + "\r\n")
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	b.WriteString("\r\n")
	b.WriteString(body)
	return b.String()
}
