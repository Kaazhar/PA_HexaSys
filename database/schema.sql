CREATE DATABASE IF NOT EXISTS upcycleconnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE upcycleconnect;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(3),
    updated_at DATETIME(3),
    deleted_at DATETIME(3),
    email VARCHAR(191) NOT NULL,
    password_hash VARCHAR(191) NOT NULL,
    firstname VARCHAR(191) NOT NULL,
    lastname VARCHAR(191) NOT NULL,
    role VARCHAR(20) DEFAULT 'particulier',
    phone VARCHAR(191),
    address VARCHAR(191),
    is_active TINYINT(1) DEFAULT 1,
    is_verified TINYINT(1) DEFAULT 0,
    first_login TINYINT(1) DEFAULT 1,
    is_banned TINYINT(1) DEFAULT 0,
    ban_reason TEXT,
    ban_expires_at DATETIME(3),
    siret VARCHAR(14),
    siret_verified TINYINT(1) DEFAULT 0,
    email_verify_token VARCHAR(64),
    password_reset_token VARCHAR(64),
    password_reset_expiry DATETIME(3),
    newsletter_subscribed TINYINT(1) DEFAULT 0,
    phone_verified TINYINT(1) DEFAULT 0,
    two_fa_enabled TINYINT(1) DEFAULT 0,
    UNIQUE KEY idx_users_email (email),
    KEY idx_users_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ban_records (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(3),
    updated_at DATETIME(3),
    deleted_at DATETIME(3),
    user_id BIGINT UNSIGNED NOT NULL,
    admin_id BIGINT UNSIGNED NOT NULL,
    reason TEXT NOT NULL,
    expires_at DATETIME(3),
    is_permanent TINYINT(1) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    KEY idx_ban_records_deleted_at (deleted_at),
    KEY idx_ban_records_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS phone_verifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(3),
    updated_at DATETIME(3),
    deleted_at DATETIME(3),
    user_id BIGINT UNSIGNED NOT NULL,
    phone VARCHAR(20) NOT NULL,
    code_hash VARCHAR(191) NOT NULL,
    purpose VARCHAR(20) NOT NULL,
    attempts INT DEFAULT 0,
    used TINYINT(1) DEFAULT 0,
    expires_at DATETIME(3),
    KEY idx_phone_verifications_deleted_at (deleted_at),
    KEY idx_phone_verifications_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(3),
    updated_at DATETIME(3),
    deleted_at DATETIME(3),
    name VARCHAR(191) NOT NULL,
    slug VARCHAR(191) NOT NULL,
    description TEXT,
    icon VARCHAR(191),
    color VARCHAR(191),
    is_active TINYINT(1) DEFAULT 1,
    UNIQUE KEY idx_categories_slug (slug),
    KEY idx_categories_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS listings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(3),
    updated_at DATETIME(3),
    deleted_at DATETIME(3),
    title VARCHAR(191) NOT NULL,
    description TEXT,
    type VARCHAR(10) NOT NULL,
    category_id BIGINT UNSIGNED,
    `condition` VARCHAR(20),
    price DOUBLE,
    location VARCHAR(191),
    images TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    user_id BIGINT UNSIGNED,
    reject_reason VARCHAR(191),
    KEY idx_listings_deleted_at (deleted_at),
    KEY idx_listings_category_id (category_id),
    KEY idx_listings_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reviews (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(3),
    updated_at DATETIME(3),
    deleted_at DATETIME(3),
    reviewer_id BIGINT UNSIGNED NOT NULL,
    target_user_id BIGINT UNSIGNED NOT NULL,
    listing_id BIGINT UNSIGNED NOT NULL,
    rating INT NOT NULL,
    comment TEXT,
    KEY idx_reviews_deleted_at (deleted_at),
    KEY idx_reviews_reviewer_id (reviewer_id),
    KEY idx_reviews_target_user_id (target_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(3),
    updated_at DATETIME(3),
    deleted_at DATETIME(3),
    listing_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    reason VARCHAR(50) NOT NULL,
    details TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    admin_note TEXT,
    resolved_by BIGINT UNSIGNED,
    KEY idx_reports_deleted_at (deleted_at),
    KEY idx_reports_listing_id (listing_id),
    KEY idx_reports_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS workshops (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(3),
    updated_at DATETIME(3),
    deleted_at DATETIME(3),
    title VARCHAR(191) NOT NULL,
    description TEXT,
    date DATETIME(3),
    duration INT,
    location VARCHAR(191),
    price DOUBLE,
    max_spots INT DEFAULT 15,
    min_spots INT DEFAULT 10,
    enrolled INT DEFAULT 0,
    image VARCHAR(191),
    category_id BIGINT UNSIGNED,
    status VARCHAR(20) DEFAULT 'draft',
    cancel_reason VARCHAR(191),
    instructor_id BIGINT UNSIGNED,
    type VARCHAR(20) DEFAULT 'atelier',
    KEY idx_workshops_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS workshop_bookings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(3),
    updated_at DATETIME(3),
    deleted_at DATETIME(3),
    workshop_id BIGINT UNSIGNED,
    user_id BIGINT UNSIGNED,
    payment_id VARCHAR(191),
    status VARCHAR(20) DEFAULT 'confirmed',
    KEY idx_workshop_bookings_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS containers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(3),
    updated_at DATETIME(3),
    deleted_at DATETIME(3),
    name VARCHAR(191) NOT NULL,
    address VARCHAR(191),
    district VARCHAR(191),
    capacity INT DEFAULT 25,
    current_count INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'operational',
    latitude DOUBLE DEFAULT 0,
    longitude DOUBLE DEFAULT 0,
    KEY idx_containers_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS container_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(3),
    updated_at DATETIME(3),
    deleted_at DATETIME(3),
    user_id BIGINT UNSIGNED,
    container_id BIGINT UNSIGNED,
    object_title VARCHAR(191),
    object_description TEXT,
    desired_date DATETIME(3),
    status VARCHAR(20) DEFAULT 'pending',
    access_code VARCHAR(191),
    barcode VARCHAR(191),
    reject_reason VARCHAR(191),
    KEY idx_container_requests_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS upcycling_scores (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(3),
    updated_at DATETIME(3),
    deleted_at DATETIME(3),
    user_id BIGINT UNSIGNED,
    total_points INT DEFAULT 0,
    level VARCHAR(30) DEFAULT 'Débutant',
    waste_avoided_kg DOUBLE DEFAULT 0,
    co2_saved_kg DOUBLE DEFAULT 0,
    water_saved_liters DOUBLE DEFAULT 0,
    UNIQUE KEY idx_upcycling_scores_user_id (user_id),
    KEY idx_upcycling_scores_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS score_entries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(3),
    updated_at DATETIME(3),
    deleted_at DATETIME(3),
    user_id BIGINT UNSIGNED,
    points INT,
    reason VARCHAR(191),
    action VARCHAR(191),
    KEY idx_score_entries_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subscriptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(3),
    updated_at DATETIME(3),
    deleted_at DATETIME(3),
    user_id BIGINT UNSIGNED,
    plan VARCHAR(20) DEFAULT 'decouverte',
    price DOUBLE,
    status VARCHAR(20) DEFAULT 'active',
    renewal_date DATETIME(3),
    stripe_id VARCHAR(191),
    KEY idx_subscriptions_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invoices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(3),
    updated_at DATETIME(3),
    deleted_at DATETIME(3),
    number VARCHAR(191) NOT NULL,
    user_id BIGINT UNSIGNED,
    type VARCHAR(20),
    amount DOUBLE,
    tax DOUBLE,
    total DOUBLE,
    status VARCHAR(20) DEFAULT 'pending',
    pdf_url VARCHAR(191),
    UNIQUE KEY idx_invoices_number (number),
    KEY idx_invoices_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(3),
    updated_at DATETIME(3),
    deleted_at DATETIME(3),
    user_id BIGINT UNSIGNED,
    message TEXT,
    type VARCHAR(20) DEFAULT 'info',
    `read` TINYINT(1) DEFAULT 0,
    KEY idx_notifications_deleted_at (deleted_at),
    KEY idx_notifications_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS conversations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(3),
    updated_at DATETIME(3),
    deleted_at DATETIME(3),
    participant_one_id BIGINT UNSIGNED NOT NULL,
    participant_two_id BIGINT UNSIGNED NOT NULL,
    listing_id BIGINT UNSIGNED,
    last_message_at DATETIME(3),
    last_message TEXT,
    KEY idx_conversations_deleted_at (deleted_at),
    KEY idx_conversations_participant_one_id (participant_one_id),
    KEY idx_conversations_participant_two_id (participant_two_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(3),
    updated_at DATETIME(3),
    deleted_at DATETIME(3),
    conversation_id BIGINT UNSIGNED NOT NULL,
    sender_id BIGINT UNSIGNED NOT NULL,
    content TEXT NOT NULL,
    `read` TINYINT(1) DEFAULT 0,
    KEY idx_messages_deleted_at (deleted_at),
    KEY idx_messages_conversation_id (conversation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS articles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(3),
    updated_at DATETIME(3),
    deleted_at DATETIME(3),
    title VARCHAR(191) NOT NULL,
    content LONGTEXT,
    author_id BIGINT UNSIGNED,
    status VARCHAR(20) DEFAULT 'draft',
    views INT DEFAULT 0,
    tags VARCHAR(191),
    KEY idx_articles_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS projects (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(3),
    updated_at DATETIME(3),
    deleted_at DATETIME(3),
    title VARCHAR(191) NOT NULL,
    description TEXT,
    before_images TEXT,
    after_images TEXT,
    tags VARCHAR(191),
    user_id BIGINT UNSIGNED,
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    is_featured TINYINT(1) DEFAULT 0,
    KEY idx_projects_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
