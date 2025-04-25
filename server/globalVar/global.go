package globalVar

import (
	"database/sql"
	"html/template"
	"time"
)

var Tpl *template.Template

type ErrorData struct {
	StatusCode int
	Message    string
}

type User struct {
	ID               string    `db:"id" json:"id"`
	Username         string    `db:"username" json:"Username"`
	Email            string    `db:"email" json:"Email"`
	Age              int       `db:"age" json:"Age"`
	Gender           string    `db:"gender" json:"Gender"`
	FirstName        string    `db:"firstName" json:"FirstName"`
	LastName         string    `db:"lastName" json:"LastName"`
	PasswordHash     string    `db:"password_hash" json:"PasswordHash"`
	Image            string    `db:"user_image" json:"user_image"`
	CreatedAt        time.Time `db:"created_at" json:"created_at"`
	UserPostCount    int       `db:"user_post_count" json:"user_post_count"`
	UserCommentCount int       `db:"user_comment_count" json:"user_comment_count"`
	UserLikeCount    int       `db:"user_like_count" json:"user_like_count"`
}

type Post struct {
	ID        string    `db:"id" json:"id"`
	UserId    string    `db:"user_id" json:"user_id"`
	Image     string    `db:"image_url" json:"image_url"`
	Title     string    `db:"title" json:"Title"`
	Content   string    `db:"content" json:"Content"`
	Categories  string    `db:"category" json:"Category"`
	CreatedAt time.Time `db:"created_at" json:"created_at"` 
	UserName  string `json:"user_name"`  
	UserImage string `json:"user_image"` 
	NbrComment int `json:"nbr_comment"`
	NbrLike    int `json:"nbr_like"`
	NbrDislike int `json:"nbr_dislike"`
	IsUserOwned bool `json:"is_user_owned"`
	IsUserLiked bool `json:"is_user_liked"`
	IsUserDisliked bool `json:"is_user_disliked"`
}

type Comment struct {
	ID        string    `db:"id" json:"id"`
	PostId    string    `db:"post_id" json:"post_id"`
	UserId    string    `db:"user_id" json:"user_id"`
	Content   string    `db:"content" json:"content"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
	UserName string		`db:"UserName" json:"UserName"`
	UserImage string     `db:"UserImage" json:"UserImage"`
	CommentLikes    int `json:"nbr_like"`
	CommentDislikes int `json:"nbr_dislike"`
	IsUserLiked bool `json:"is_user_liked"`
	IsUserDisliked bool `json:"is_user_disliked"`
}

type Categories struct {
	ID              string `db:"id" json:"id"`
	CategoryName    string `db:"category_name" json:"category_name"`
}

type PostCategory struct {
	PostId     string `db:"post_id" json:"post_id"`
	CategoryId string `db:"category_id" json:"category_id"`
}

type LikeDislike struct {
	ID     string `db:"id" json:"id"`
	UserId string `db:"user_id" json:"user_id"`
	PostId string `db:"post_id" json:"post_id"`
	IsLike bool   `db:"is_like" json:"is_like"`
}



var (
	DB            *sql.DB
	Users         []User
	Posts         []Post
	Comments      []Comment
	LikesDislikes []LikeDislike
)

