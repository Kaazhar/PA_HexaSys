package config

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDB() {
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")

	dsnNoDB := fmt.Sprintf("%s:%s@tcp(%s:%s)/?charset=utf8mb4&parseTime=True&loc=Local",
		user, password, host, port)
	if tmpDB, err2 := gorm.Open(mysql.Open(dsnNoDB), &gorm.Config{}); err2 == nil {
		tmpDB.Exec(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;", dbname))
		if sqlDB, err3 := tmpDB.DB(); err3 == nil {
			sqlDB.Close()
		}
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&collation=utf8mb4_unicode_ci&parseTime=True&loc=Local",
		user, password, host, port, dbname)

	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	DB.Exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci")
	DB.Exec("SET GLOBAL innodb_default_row_format = 'DYNAMIC'")
	DB.Exec("SET SESSION innodb_strict_mode = OFF")

	log.Println("Database connected successfully")
}
