package globalVar

import (
	"database/sql"
	"html/template"
	"time"
)

type User struct {
	ID               string    `db:"id" json:"id"`
	Username         string    `db:"username" json:"Username"`
	Email            string    `db:"email" json:"Email"`
	Age              int       `db:"age" json:"Age"`
	Gender           string    `db:"gender" json:"Gender"`
	FirstName        string    `db:"firstName" json:"FirstName"`
	LastName         string    `db:"lastName" json:"LastName"`
	PasswordHash     string    `db:"password_hash" json:"PasswordHash"`
	CreatedAt        time.Time `db:"created_at" json:"created_at"`
	UserPostCount    int       `db:"user_post_count" json:"user_post_count"`
	UserCommentCount int       `db:"user_comment_count" json:"user_comment_count"`
}

type Post struct {
	ID         string    `db:"id" json:"id"`
	UserId     string    `db:"user_id" json:"user_id"`
	Image      string    `db:"image_url" json:"image_url"`
	Title      string    `db:"title" json:"Title"`
	Content    string    `db:"content" json:"Content"`
	Categories string    `db:"category" json:"Category"`
	CreatedAt  time.Time `db:"created_at" json:"created_at"`
	UserName   string    `json:"user_name"`
	NbrComment int       `json:"nbr_comment"`
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

var (
	Tpl               *template.Template
	DB                *sql.DB
	Users             []User
	Posts             []Post
	SliceOfCategories []Categories
	Comments          []Comment
	ReserveCategories []string
)
