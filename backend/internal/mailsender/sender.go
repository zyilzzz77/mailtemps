package mailsender

import (
	"context"
	"net/mail"
	"time"
)

// Message adalah satu email keluar berupa teks polos.
type Message struct {
	From      mail.Address
	To        []mail.Address
	Subject   string
	TextBody  string
	MessageID string
	Date      time.Time
}

// Sender mengirim email keluar ke server tujuan.
type Sender interface {
	Send(ctx context.Context, msg Message) error
}
