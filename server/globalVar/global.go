package globalVar

import (
	"database/sql"
	"html/template"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type User struct {
	ID           string    `db:"id" json:"id"`
	Username     string    `db:"username" json:"Username"`
	Email        string    `db:"email" json:"Email"`
	Age          int       `db:"age" json:"Age"`
	Gender       string    `db:"gender" json:"Gender"`
	FirstName    string    `db:"firstName" json:"FirstName"`
	LastName     string    `db:"lastName" json:"LastName"`
	PasswordHash string    `db:"password_hash" json:"PasswordHash"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
}

type Post struct {
	ID         string    `db:"id" json:"id"`
	UserId     string    `db:"user_id" json:"user_id"`
	Title      string    `db:"title" json:"title"`
	Content    string    `db:"content" json:"content"`
	Categories []string  `db:"category" json:"categories"`
	CreatedAt  time.Time `db:"created_at" json:"created_at"`
	UserName   string    `json:"user_name"`
}

type Comment struct {
	ID        string    `db:"id" json:"id"`
	PostId    string    `db:"post_id" json:"post_id"`
	UserName  string    `db:"UserName" json:"UserName"`
	UserId    string    `db:"user_id" json:"user_id"`
	Content   string    `db:"content" json:"content"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

type Categories struct {
	ID           string `db:"id" json:"id"`
	CategoryName string `db:"category_name" json:"Category_name"`
}

type PostCategory struct {
	PostId     string `db:"post_id" json:"post_id"`
	CategoryId string `db:"category_id" json:"category_id"`
}

type Connection struct {
	Conn     *websocket.Conn
	UserID   string
	Username string
	WriteMu  sync.Mutex
}

type ChatMessage struct {
	SenderID   string    `json:"sender_id"`
	SenderName string    `json:"sender_name"`
	ReceiverID string    `json:"receiver_id"`
	Content    string    `json:"content"`
	Timestamp  time.Time `json:"timestamp"`
}

type Message struct {
	ID        string    `json:"id"`
	SenderID  string    `json:"sender_id"`
	Username  string    `json:"username"`
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
}

var (
	Tpl                    *template.Template
	DB                     *sql.DB
	Users                  []User
	Posts                  []Post
	SliceOfCategories      []Categories
	Comments               []Comment
	ReserveCategories      []string
	ActiveConnections      = make(map[string][]*Connection)
	ActiveConnectionsMutex sync.RWMutex
)
