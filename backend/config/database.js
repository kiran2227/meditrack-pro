const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Leave empty if no password
  database: 'meditrack_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection function
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Initialize database tables
const initDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    
    console.log('🔄 Creating database tables...');

    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        age INT,
        medical_history TEXT,
        guardian_name VARCHAR(255),
        guardian_contact VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Medicines table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS medicines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        dosage VARCHAR(100) NOT NULL,
        time TIME NOT NULL,
        frequency VARCHAR(50) DEFAULT 'once',
        stock INT DEFAULT 0,
        refill_reminder INT DEFAULT 0,
        status ENUM('pending', 'taken', 'missed') DEFAULT 'pending',
        voice_alert_path VARCHAR(500),
        custom_reminder_minutes INT DEFAULT 0,
        taken_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Voice alerts table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS voice_alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        medicine_id INT,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE SET NULL
      )
    `);

    // History table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        medicine_id INT NOT NULL,
        medicine_name VARCHAR(255) NOT NULL,
        dosage VARCHAR(100) NOT NULL,
        scheduled_time TIME NOT NULL,
        actual_time TIMESTAMP NULL,
        status ENUM('taken', 'missed', 'rescheduled') NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
      )
    `);

    connection.release();
    console.log('✅ Database tables initialized successfully');
    
    // Test the connection
    await testConnection();
    
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    throw error;
  }
};

module.exports = { pool, initDatabase, testConnection };