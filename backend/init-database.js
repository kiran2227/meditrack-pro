const mysql = require('mysql2/promise');

const initDatabase = async () => {
  let connection;
  
  try {
    // First, connect without specifying database to create it
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });

    console.log('🔗 Connected to MySQL server');

    // Create database if it doesn't exist
    await connection.execute('CREATE DATABASE IF NOT EXISTS meditrack_db');
    console.log('✅ Database created or already exists');

    // Switch to the database
    await connection.execute('USE meditrack_db');
    console.log('✅ Using meditrack_db');

    // Create users table
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
    console.log('✅ Users table created');

    // Create medicines table
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
    console.log('✅ Medicines table created');

    // Create voice_alerts table
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
    console.log('✅ Voice alerts table created');

    // Create history table
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
    console.log('✅ History table created');

    console.log('\n🎉 Database setup completed successfully!');
    console.log('📊 Tables created: users, medicines, voice_alerts, history');

  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
};

// Run the initialization
initDatabase();