package migration

import (
	"log"
	"os"
	g "real-time-forum/server/globalVar"
)

func Migrate() {
	filePath := os.Getenv("MODULES_SQL_PATH")
	if filePath == "" {
		filePath = "./server/database/modules.sql"
	}

	query, err := os.ReadFile(filePath)
	if err != nil {
		log.Fatal(err)
	}
	_, err = g.DB.Exec(string(query))
	if err != nil {
		log.Fatal(err)
	}

	log.Println("Database migrated successfully")
}
