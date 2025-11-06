const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 5000;

// MySQL Database Configuration
const dbConfig = {
    host: 'localhost',
    user: 'root', // Change to your MySQL username
    password: '12345678', // Change to your MySQL password
    database: 'meditrack_db'
};

// Initialize Database Connection
async function initializeDatabase() {
    try {
        // Create connection without database first
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });

        // Create database if it doesn't exist
        await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        console.log('✅ Database created or already exists');

        // Connect to the database
        const db = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL database');

        // Create tables
        await createTables(db);
        return db;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

// Create tables
async function createTables(db) {
    // Users table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            age INT,
            medical_history TEXT,
            guardian_name VARCHAR(255),
            guardian_contact VARCHAR(255),
            profile_photo VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Medicines table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS medicines (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            dosage VARCHAR(255) NOT NULL,
            time TIME NOT NULL,
            frequency VARCHAR(50) DEFAULT 'once',
            stock INT DEFAULT 0,
            refill_reminder INT DEFAULT 0,
            voice_alert_type VARCHAR(50) DEFAULT 'default',
            voice_alert_id VARCHAR(255),
            medicine_photo VARCHAR(255),
            status VARCHAR(50) DEFAULT 'pending',
            taken_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // History table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS history (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            medicine_id VARCHAR(255) NOT NULL,
            medicine_name VARCHAR(255) NOT NULL,
            dosage VARCHAR(255) NOT NULL,
            scheduled_time TIME NOT NULL,
            actual_time VARCHAR(255),
            status VARCHAR(50) NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Voice alerts table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS voice_alerts (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    console.log('✅ All tables created successfully');
}

// Initialize database
let db;
initializeDatabase().then(connection => {
    db = connection;
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = 'uploads/';
        if (file.fieldname === 'profilePhoto') {
            folder += 'profile-photos/';
        } else if (file.fieldname === 'medicinePhoto') {
            folder += 'medicine-photos/';
        } else if (file.fieldname === 'voiceFile') {
            folder += 'voice-alerts/';
        }
        
        const fullPath = path.join(__dirname, folder);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'voiceFile') {
            if (file.mimetype.startsWith('audio/')) {
                cb(null, true);
            } else {
                cb(new Error('Only audio files are allowed for voice alerts!'), false);
            }
        } else if (file.fieldname === 'profilePhoto' || file.fieldname === 'medicinePhoto') {
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Only image files are allowed!'), false);
            }
        } else {
            cb(null, true);
        }
    }
});

// In-memory storage for active reminders
let activeReminders = new Map();
let reminderIntervals = new Map();

// Create uploads directory structure
const uploadsDirs = [
    'uploads',
    'uploads/profile-photos',
    'uploads/medicine-photos',
    'uploads/voice-alerts'
];

uploadsDirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

console.log('✅ Upload directories created');

// Enhanced reminder checking (SERVER-SIDE ONLY - No browser APIs)
async function checkReminders() {
    try {
        const [medicines] = await db.execute(`
            SELECT * FROM medicines WHERE status = 'pending'
        `);

        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

        for (const medicine of medicines) {
            if (medicine.time === currentTime) {
                if (!activeReminders.has(medicine.id)) {
                    console.log(`🔔 Reminder triggered for: ${medicine.name} at ${currentTime}`);
                    activeReminders.set(medicine.id, medicine);
                    
                    // Log low stock alert if applicable
                    if (medicine.stock <= medicine.refill_reminder && medicine.refill_reminder > 0) {
                        console.log(`⚠️ LOW STOCK: ${medicine.name} has ${medicine.stock} doses left`);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error checking reminders:', error);
    }
}

// Check reminders every 30 seconds
setInterval(checkReminders, 30000);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'MediTrack Pro API is running!',
        timestamp: new Date().toISOString(),
        port: PORT,
        database: 'MySQL Connected'
    });
});

// Get active reminders
app.get('/api/reminders', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User ID required'
            });
        }
        
        const userReminders = Array.from(activeReminders.values())
            .filter(med => med.user_id === userId);
        
        res.json({
            success: true,
            reminders: userReminders
        });
    } catch (error) {
        console.error('Get reminders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reminders'
        });
    }
});

// Clear reminder
app.delete('/api/reminders/:medicineId', (req, res) => {
    const medicineId = req.params.medicineId;
    
    activeReminders.delete(medicineId);
    if (reminderIntervals.has(medicineId)) {
        clearInterval(reminderIntervals.get(medicineId));
        reminderIntervals.delete(medicineId);
    }
    
    res.json({
        success: true,
        message: 'Reminder cleared'
    });
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, age, medical_history, guardian_name, guardian_contact } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and password are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Check if user exists
        const [existingUsers] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        const userId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const user = {
            id: userId,
            name,
            email,
            password, // In production, hash this password!
            age: age || null,
            medical_history: medical_history || null,
            guardian_name: guardian_name || null,
            guardian_contact: guardian_contact || null,
            profile_photo: null
        };

        await db.execute(
            `INSERT INTO users (id, name, email, password, age, medical_history, guardian_name, guardian_contact, profile_photo) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [user.id, user.name, user.email, user.password, user.age, user.medical_history, 
             user.guardian_name, user.guardian_contact, user.profile_photo]
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                age: user.age,
                medical_history: user.medical_history,
                guardian_name: user.guardian_name,
                guardian_contact: user.guardian_contact,
                profile_photo: user.profile_photo
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const [users] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = users[0];

        // In production, use bcrypt to compare hashed passwords
        if (user.password !== password) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                age: user.age,
                medical_history: user.medical_history,
                guardian_name: user.guardian_name,
                guardian_contact: user.guardian_contact,
                profile_photo: user.profile_photo
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Voice Alerts Routes
app.post('/api/voice/upload', upload.single('voiceFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const userId = req.headers['user-id'];
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User ID required'
            });
        }

        const { alertName } = req.body;

        const voiceAlertId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const voiceAlert = {
            id: voiceAlertId,
            user_id: userId,
            name: alertName || `Voice Alert ${new Date().toLocaleDateString()}`,
            file_name: req.file.filename,
            file_path: req.file.path
        };

        await db.execute(
            'INSERT INTO voice_alerts (id, user_id, name, file_name, file_path) VALUES (?, ?, ?, ?, ?)',
            [voiceAlert.id, voiceAlert.user_id, voiceAlert.name, voiceAlert.file_name, voiceAlert.file_path]
        );

        res.json({
            success: true,
            message: 'Voice alert uploaded successfully',
            voiceAlert: {
                id: voiceAlert.id,
                name: voiceAlert.name,
                file_name: voiceAlert.file_name,
                created_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Upload voice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload voice alert'
        });
    }
});

app.get('/api/voice', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User ID required'
            });
        }
        
        const [voiceAlerts] = await db.execute(
            'SELECT * FROM voice_alerts WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        
        res.json({
            success: true,
            voiceAlerts: voiceAlerts
        });
    } catch (error) {
        console.error('Get voice alerts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch voice alerts'
        });
    }
});

// Medicine Routes
app.get('/api/medicines', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User ID required'
            });
        }
        
        const [medicines] = await db.execute(
            'SELECT * FROM medicines WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        
        res.json({
            success: true,
            medicines: medicines
        });
    } catch (error) {
        console.error('Get medicines error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch medicines'
        });
    }
});

app.post('/api/medicines', upload.fields([
    { name: 'medicinePhoto', maxCount: 1 },
    { name: 'voiceFile', maxCount: 1 }
]), async (req, res) => {
    try {
        const { name, dosage, frequency, medicineTime1, medicineTime2, medicineTime3, stock, refill_reminder, voice_alert_type, alertName } = req.body;
        const userId = req.headers['user-id'];

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User ID required'
            });
        }

        if (!name || !dosage || !medicineTime1) {
            return res.status(400).json({
                success: false,
                message: 'Name, dosage and at least one time are required'
            });
        }

        // Handle multiple times based on frequency
        let times = [medicineTime1];
        if (frequency === 'twice' && medicineTime2) {
            times.push(medicineTime2);
        } else if (frequency === 'thrice' && medicineTime2 && medicineTime3) {
            times.push(medicineTime2, medicineTime3);
        }

        // Create separate medicine entries for each time
        const medicineIds = [];
        for (let i = 0; i < times.length; i++) {
            const time = times[i];
            
            let medicinePhoto = null;
            let voiceAlertId = null;

            // Handle medicine photo (only for first entry)
            if (i === 0 && req.files && req.files['medicinePhoto']) {
                medicinePhoto = req.files['medicinePhoto'][0].filename;
            }

            // Handle voice alert (only for first entry)
            if (i === 0 && req.files && req.files['voiceFile']) {
                const voiceFile = req.files['voiceFile'][0];
                const voiceAlertId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                const voiceAlert = {
                    id: voiceAlertId,
                    user_id: userId,
                    name: alertName || `Voice for ${name}`,
                    file_name: voiceFile.filename,
                    file_path: voiceFile.path
                };

                await db.execute(
                    'INSERT INTO voice_alerts (id, user_id, name, file_name, file_path) VALUES (?, ?, ?, ?, ?)',
                    [voiceAlert.id, voiceAlert.user_id, voiceAlert.name, voiceAlert.file_name, voiceAlert.file_path]
                );
                voiceAlertId = voiceAlert.id;
            }

            const medicineId = Date.now().toString() + i + Math.random().toString(36).substr(2, 5);
            const medicine = {
                id: medicineId,
                user_id: userId,
                name: i === 0 ? name : `${name} (Time ${i + 1})`,
                dosage: dosage,
                time: time,
                frequency: frequency,
                stock: stock || 0,
                refill_reminder: refill_reminder || 0,
                voice_alert_type: voice_alert_type || 'default',
                voice_alert_id: voiceAlertId,
                medicine_photo: medicinePhoto,
                status: 'pending'
            };

            await db.execute(
                `INSERT INTO medicines (id, user_id, name, dosage, time, frequency, stock, refill_reminder, 
                 voice_alert_type, voice_alert_id, medicine_photo, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [medicine.id, medicine.user_id, medicine.name, medicine.dosage, medicine.time, 
                 medicine.frequency, medicine.stock, medicine.refill_reminder, medicine.voice_alert_type,
                 medicine.voice_alert_id, medicine.medicine_photo, medicine.status]
            );

            medicineIds.push(medicine.id);
        }

        res.status(201).json({
            success: true,
            message: `Medicine added successfully with ${times.length} reminder(s)`,
            medicineIds: medicineIds
        });

    } catch (error) {
        console.error('Add medicine error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add medicine'
        });
    }
});

// Get single medicine for editing
app.get('/api/medicines/:id', async (req, res) => {
    try {
        const medicineId = req.params.id;
        const userId = req.headers['user-id'];

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User ID required'
            });
        }

        const [medicines] = await db.execute(
            'SELECT * FROM medicines WHERE id = ? AND user_id = ?',
            [medicineId, userId]
        );

        if (medicines.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Medicine not found'
            });
        }

        res.json({
            success: true,
            medicine: medicines[0]
        });

    } catch (error) {
        console.error('Get medicine error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch medicine'
        });
    }
});

// Update medicine
app.put('/api/medicines/:id', upload.fields([
    { name: 'medicinePhoto', maxCount: 1 },
    { name: 'voiceFile', maxCount: 1 }
]), async (req, res) => {
    try {
        const medicineId = req.params.id;
        const userId = req.headers['user-id'];
        const { name, dosage, time, frequency, stock, refill_reminder, voice_alert_type, alertName } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User ID required'
            });
        }

        // Check if medicine exists
        const [medicines] = await db.execute(
            'SELECT * FROM medicines WHERE id = ? AND user_id = ?',
            [medicineId, userId]
        );

        if (medicines.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Medicine not found'
            });
        }

        let medicinePhoto = medicines[0].medicine_photo;
        let voiceAlertId = medicines[0].voice_alert_id;

        // Handle medicine photo update
        if (req.files && req.files['medicinePhoto']) {
            medicinePhoto = req.files['medicinePhoto'][0].filename;
        }

        // Handle voice alert update
        if (req.files && req.files['voiceFile']) {
            const voiceFile = req.files['voiceFile'][0];
            const newVoiceAlertId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            const voiceAlert = {
                id: newVoiceAlertId,
                user_id: userId,
                name: alertName || `Voice for ${name}`,
                file_name: voiceFile.filename,
                file_path: voiceFile.path
            };

            await db.execute(
                'INSERT INTO voice_alerts (id, user_id, name, file_name, file_path) VALUES (?, ?, ?, ?, ?)',
                [voiceAlert.id, voiceAlert.user_id, voiceAlert.name, voiceAlert.file_name, voiceAlert.file_path]
            );
            voiceAlertId = voiceAlert.id;
        }

        // Update medicine
        await db.execute(
            `UPDATE medicines SET 
             name = ?, dosage = ?, time = ?, frequency = ?, stock = ?, refill_reminder = ?,
             voice_alert_type = ?, voice_alert_id = ?, medicine_photo = ?
             WHERE id = ? AND user_id = ?`,
            [name, dosage, time, frequency, stock, refill_reminder, 
             voice_alert_type, voiceAlertId, medicinePhoto, medicineId, userId]
        );

        // Get updated medicine
        const [updatedMedicines] = await db.execute(
            'SELECT * FROM medicines WHERE id = ? AND user_id = ?',
            [medicineId, userId]
        );

        res.json({
            success: true,
            message: 'Medicine updated successfully',
            medicine: updatedMedicines[0]
        });

    } catch (error) {
        console.error('Update medicine error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update medicine'
        });
    }
});

app.post('/api/medicines/:id/taken', async (req, res) => {
    try {
        const medicineId = req.params.id;
        const { notes } = req.body;
        const userId = req.headers['user-id'];

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User ID required'
            });
        }

        const [medicines] = await db.execute(
            'SELECT * FROM medicines WHERE id = ? AND user_id = ?',
            [medicineId, userId]
        );

        if (medicines.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Medicine not found'
            });
        }

        const medicine = medicines[0];

        // Update medicine status and decrement stock
        await db.execute(
            'UPDATE medicines SET status = "taken", taken_at = CURRENT_TIMESTAMP, stock = GREATEST(0, stock - 1) WHERE id = ?',
            [medicineId]
        );

        // Clear from active reminders
        activeReminders.delete(medicineId);
        if (reminderIntervals.has(medicineId)) {
            clearInterval(reminderIntervals.get(medicineId));
            reminderIntervals.delete(medicineId);
        }

        // Add to history
        const historyId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const historyEntry = {
            id: historyId,
            user_id: medicine.user_id,
            medicine_id: medicineId,
            medicine_name: medicine.name,
            dosage: medicine.dosage,
            scheduled_time: medicine.time,
            actual_time: new Date().toLocaleString('en-US', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false 
            }),
            status: 'taken',
            notes: notes || ''
        };

        await db.execute(
            `INSERT INTO history (id, user_id, medicine_id, medicine_name, dosage, scheduled_time, 
             actual_time, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [historyEntry.id, historyEntry.user_id, historyEntry.medicine_id, historyEntry.medicine_name,
             historyEntry.dosage, historyEntry.scheduled_time, historyEntry.actual_time,
             historyEntry.status, historyEntry.notes]
        );

        res.json({
            success: true,
            message: 'Medicine marked as taken'
        });

    } catch (error) {
        console.error('Mark as taken error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update medicine'
        });
    }
});

app.post('/api/medicines/:id/reschedule', async (req, res) => {
    try {
        const medicineId = req.params.id;
        const { remindInMinutes } = req.body;
        const userId = req.headers['user-id'];

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User ID required'
            });
        }

        const [medicines] = await db.execute(
            'SELECT * FROM medicines WHERE id = ? AND user_id = ?',
            [medicineId, userId]
        );

        if (medicines.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Medicine not found'
            });
        }

        const medicine = medicines[0];

        // Clear current reminder
        activeReminders.delete(medicineId);
        if (reminderIntervals.has(medicineId)) {
            clearInterval(reminderIntervals.get(medicineId));
            reminderIntervals.delete(medicineId);
        }

        // Calculate new time
        const newTime = new Date(Date.now() + remindInMinutes * 60000);
        const newTimeString = newTime.toTimeString().slice(0, 5);

        // Add to history as rescheduled
        const historyId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const historyEntry = {
            id: historyId,
            user_id: medicine.user_id,
            medicine_id: medicineId,
            medicine_name: medicine.name,
            dosage: medicine.dosage,
            scheduled_time: medicine.time,
            actual_time: null,
            status: 'rescheduled',
            notes: `Rescheduled for ${remindInMinutes} minutes later (${newTimeString})`
        };

        await db.execute(
            `INSERT INTO history (id, user_id, medicine_id, medicine_name, dosage, scheduled_time, 
             actual_time, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [historyEntry.id, historyEntry.user_id, historyEntry.medicine_id, historyEntry.medicine_name,
             historyEntry.dosage, historyEntry.scheduled_time, historyEntry.actual_time,
             historyEntry.status, historyEntry.notes]
        );

        res.json({
            success: true,
            message: `Medicine will remind you again in ${remindInMinutes} minutes`,
            newTime: newTimeString
        });

    } catch (error) {
        console.error('Reschedule error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reschedule medicine'
        });
    }
});

app.delete('/api/medicines/:id', async (req, res) => {
    try {
        const medicineId = req.params.id;
        const userId = req.headers['user-id'];

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User ID required'
            });
        }

        const [result] = await db.execute(
            'DELETE FROM medicines WHERE id = ? AND user_id = ?',
            [medicineId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Medicine not found'
            });
        }

        // Clear from active reminders
        activeReminders.delete(medicineId);
        if (reminderIntervals.has(medicineId)) {
            clearInterval(reminderIntervals.get(medicineId));
            reminderIntervals.delete(medicineId);
        }

        res.json({
            success: true,
            message: 'Medicine deleted successfully'
        });

    } catch (error) {
        console.error('Delete medicine error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete medicine'
        });
    }
});

// User Profile Routes
app.get('/api/users/profile', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User ID required'
            });
        }

        const [users] = await db.execute(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                age: user.age,
                medical_history: user.medical_history,
                guardian_name: user.guardian_name,
                guardian_contact: user.guardian_contact,
                profile_photo: user.profile_photo
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
});

app.put('/api/users/profile', upload.single('profilePhoto'), async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User ID required'
            });
        }

        const { name, age, medical_history, guardian_name, guardian_contact } = req.body;

        const [users] = await db.execute(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        let profile_photo = users[0].profile_photo;

        // Handle profile photo upload
        if (req.file) {
            profile_photo = req.file.filename;
        }

        await db.execute(
            `UPDATE users SET name = ?, age = ?, medical_history = ?, guardian_name = ?, 
             guardian_contact = ?, profile_photo = ? WHERE id = ?`,
            [name, age, medical_history, guardian_name, guardian_contact, profile_photo, userId]
        );

        // Get updated user
        const [updatedUsers] = await db.execute(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: updatedUsers[0].id,
                name: updatedUsers[0].name,
                email: updatedUsers[0].email,
                age: updatedUsers[0].age,
                medical_history: updatedUsers[0].medical_history,
                guardian_name: updatedUsers[0].guardian_name,
                guardian_contact: updatedUsers[0].guardian_contact,
                profile_photo: updatedUsers[0].profile_photo
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// History Routes with filtering
app.get('/api/history', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User ID required'
            });
        }

        const { range = '30', status = 'all' } = req.query;
        
        let query = 'SELECT * FROM history WHERE user_id = ?';
        const params = [userId];

        // Add date range filter
        if (range !== 'all') {
            const days = parseInt(range);
            query += ' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
            params.push(days);
        }

        // Add status filter
        if (status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC';

        const [history] = await db.execute(query, params);

        res.json({
            success: true,
            history: history
        });

    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch history'
        });
    }
});

// Enhanced Export history - FIXED DATE FORMAT
app.get('/api/export/history', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User ID required'
            });
        }
        
        const [history] = await db.execute(
            'SELECT * FROM history WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        
        let csvContent = 'Medicine,Dosage,Scheduled Time,Actual Time,Status,Notes\n';
        
        history.forEach(record => {
            // FIXED: Proper date formatting for CSV export
            // const date = new Date(record.created_at);
            // const formattedDate = date.toLocaleDateString('en-US', {
            //     year: 'numeric',
            //     month: '2-digit',
            //     day: '2-digit'
            // });
            
            // Handle actual_time - use stored value directly
            const actualTime = record.actual_time && record.actual_time !== 'null' ? 
                record.actual_time : '-';
            
            // Escape quotes and commas for CSV
            const escapeCSV = (str) => {
                if (!str) return '';
                return `"${String(str).replace(/"/g, '""')}"`;
            };
            
            csvContent += `${escapeCSV(record.medicine_name)},${escapeCSV(record.dosage)},${escapeCSV(record.scheduled_time)},${escapeCSV(actualTime)},${escapeCSV(record.status)},${escapeCSV(record.notes)}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=meditrack-history-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csvContent);

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export history'
        });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 10MB.'
            });
        }
    }
    
    console.error('Server error:', error);
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 MediTrack Pro server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌐 Frontend: http://localhost:${PORT}/`);
    console.log(`💾 Database: MySQL connected`);
    console.log(`⏰ Reminder checker running every 30 seconds`);
    console.log(`📁 Upload directories ready`);
});