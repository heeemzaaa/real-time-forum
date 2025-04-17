package globalVar

import (
	"database/sql"
	"html/template"
	"time"
)

var DB *sql.DB
var Tpl *template.Template

type ErrorData struct {
	StatusCode int
	Message    string
}


type User struct {
	ID               string    `db:"id" json:"id"`
	Email            string    `db:"email" json:"email"`
	UserName             string    `db:"user_name" json:"user_name"`
	PasswordHash     string    `db:"password_hash" json:"password_hash"`
	Image            string    `db:"user_image" json:"user_image"`
	CreatedAt        time.Time `db:"created_at" json:"created_at"`
	UserPostCount    int       `db:"user_post_count" json:"user_post_count"`
	UserCommentCount int       `db:"user_comment_count" json:"user_comment_count"`
	UserLikeCount    int       `db:"user_like_count" json:"user_like_count"`
}
