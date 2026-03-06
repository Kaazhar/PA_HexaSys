package main

import (
    "database/sql"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
    "time"

    _ "github.com/lib/pq"
)

type StatusResponse struct {
    Status    string    `json:"status"`
    Service   string    `json:"service"`
    Version   string    `json:"version"`
    Database  string    `json:"database"`
    Timestamp time.Time `json:"timestamp"`
}

var db *sql.DB

func main() {
    // Connexion à la base de données
    dbHost := os.Getenv("DB_HOST")
    dbPort := os.Getenv("DB_PORT")
    dbUser := os.Getenv("DB_USER")
    dbPassword := os.Getenv("DB_PASSWORD")
    dbName := os.Getenv("DB_NAME")

    connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
        dbHost, dbPort, dbUser, dbPassword, dbName)

    var err error
    db, err = sql.Open("postgres", connStr)
    if err != nil {
        log.Fatal("Erreur connexion DB:", err)
    }
    defer db.Close()

    // Test connexion
    err = db.Ping()
    if err != nil {
        log.Fatal("DB ping failed:", err)
    }
    log.Println("✅ Connexion à la base de données réussie!")

    // Routes
    http.HandleFunc("/", homeHandler)
    http.HandleFunc("/health", healthHandler)
    http.HandleFunc("/api/status", statusHandler)
    http.HandleFunc("/api/users", usersHandler)

    port := "8080"
    log.Printf("🚀 UpcycleConnect API listening on port %s\n", port)
    log.Fatal(http.ListenAndServe(":"+port, enableCORS(http.DefaultServeMux)))
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/html; charset=utf-8")
    html := `
    <!DOCTYPE html>
    <html>
    <head>
        <title>UpcycleConnect API</title>
        <style>
            body { font-family: Arial; background: #667eea; color: white; text-align: center; padding: 50px; }
            h1 { font-size: 3em; }
            .info { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 600px; }
            a { color: #FFD700; }
        </style>
    </head>
    <body>
        <h1>🚀 UpcycleConnect API</h1>
        <div class="info">
            <h2>API Opérationnelle ✅</h2>
            <p>Endpoints disponibles:</p>
            <ul style="list-style: none;">
                <li><a href="/health">/health</a> - Health check</li>
                <li><a href="/api/status">/api/status</a> - Status détaillé</li>
                <li><a href="/api/users">/api/users</a> - Liste utilisateurs (test)</li>
            </ul>
        </div>
    </body>
    </html>
    `
    fmt.Fprint(w, html)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    fmt.Fprint(w, "OK")
}

func statusHandler(w http.ResponseWriter, r *http.Request) {
    dbStatus := "disconnected"
    if db.Ping() == nil {
        dbStatus = "connected"
    }

    response := StatusResponse{
        Status:    "running",
        Service:   "UpcycleConnect API",
        Version:   "1.0.0",
        Database:  dbStatus,
        Timestamp: time.Now(),
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

func usersHandler(w http.ResponseWriter, r *http.Request) {
    // Test query DB
    rows, err := db.Query("SELECT 'Admin' as name, 'admin@upcycle.com' as email UNION SELECT 'User', 'user@upcycle.com'")
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    defer rows.Close()

    type User struct {
        Name  string `json:"name"`
        Email string `json:"email"`
    }

    var users []User
    for rows.Next() {
        var u User
        if err := rows.Scan(&u.Name, &u.Email); err != nil {
            continue
        }
        users = append(users, u)
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(users)
}

func enableCORS(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }
        next.ServeHTTP(w, r)
    })
}
