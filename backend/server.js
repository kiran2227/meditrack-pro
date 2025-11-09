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
    user: 'root',
    password: '12345678',
    database: 'meditrack_db'
};

// Initialize Database Connection
async function initializeDatabase() {
    try {
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });

        await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        console.log('✅ Database created or already exists');

        const db = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL database');

        await createTables(db);
        return db;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

// Create tables
async function createTables(db) {
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
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'User-ID']
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
// ✅ Serve uploaded files publicly
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


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
        fileSize: 10 * 1024 * 1024
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

// FIXED: Enhanced reminder checking with proper time comparison
// ✅ Proper reminder checking function
async function checkReminders() {
    try {
        const [medicines] = await db.execute(
            'SELECT * FROM medicines WHERE status = "pending"'
        );

        const now = new Date();
        const currentHours = now.getHours().toString().padStart(2, '0');
        const currentMinutes = now.getMinutes().toString().padStart(2, '0');
        const currentTime = `${currentHours}:${currentMinutes}`;

        //console.log(`⏰ Checking ${medicines.length} medicines at ${currentTime}`);

        for (const medicine of medicines) {
            let medicineTime = medicine.time;

            // Convert TIME to HH:MM format
            if (medicineTime instanceof Date) {
                medicineTime = medicineTime.toTimeString().slice(0, 5);
            } else if (typeof medicineTime === 'string') {
                // Remove seconds if present
                medicineTime = medicineTime.slice(0, 5);
            }

            // Compare and trigger reminder
            if (medicineTime === currentTime) {
                if (!activeReminders.has(medicine.id)) {
                    console.log(`🔔 REMINDER TRIGGERED: ${medicine.name} for user ${medicine.user_id}`);
                    activeReminders.set(medicine.id, medicine);

                    if (medicine.stock <= medicine.refill_reminder && medicine.refill_reminder > 0) {
                        console.log(`⚠️ LOW STOCK: ${medicine.name} has ${medicine.stock} doses left`);
                    }
                }
            } else {
                if (activeReminders.has(medicine.id)) {
                    console.log(`🗑️ Removing expired reminder: ${medicine.name}`);
                    activeReminders.delete(medicine.id);
                }
            }
        }

       // console.log(`📊 Active reminders: ${activeReminders.size}`);
    } catch (error) {
        console.error('❌ Error checking reminders:', error);
    }
}

// ✅ Run reminder checker every 30 seconds
setInterval(checkReminders, 30000);

// ✅ Also run once immediately at startup
setTimeout(checkReminders, 1000);

// ✅ Separate cleanup task (runs once per 24h)
setInterval(async () => {
    try {
        const [expired] = await db.execute(
            'SELECT id, name FROM medicines WHERE end_date IS NOT NULL AND end_date < CURDATE()'
        );
        if (expired.length > 0) {
            const ids = expired.map(x => x.id);
            await db.execute('DELETE FROM medicines WHERE id IN (?)', [ids]);
            console.log(`🗑️ Deleted ${ids.length} expired medicines.`);
        }
    } catch (err) {
        console.error('Cleanup error:', err);
    }
}, 24 * 60 * 60 * 1000); // Every 24 hours


// Get active reminders - FIXED
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
        
        //console.log(`📋 Sending ${userReminders.length} reminders to user ${userId}`);
        
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

// Debug endpoint
app.get('/api/debug/reminders', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        
        const [medicines] = await db.execute(
            'SELECT id, name, time, status, user_id FROM medicines WHERE user_id = ? ORDER BY time',
            [userId]
        );
        
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        
        res.json({
            success: true,
            currentTime,
            medicines,
            activeReminders: Array.from(activeReminders.values())
                .filter(med => med.user_id === userId)
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ success: false, message: 'Debug failed' });
    }
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

        await db.execute(
            `INSERT INTO users (id, name, email, password, age, medical_history, guardian_name, guardian_contact, profile_photo) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, name, email, password, age, medical_history, guardian_name, guardian_contact, null]
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: userId,
                name,
                email,
                age,
                medical_history,
                guardian_name,
                guardian_contact
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

        await db.execute(
            'INSERT INTO voice_alerts (id, user_id, name, file_name, file_path) VALUES (?, ?, ?, ?, ?)',
            [voiceAlertId, userId, alertName || `Voice Alert ${new Date().toLocaleDateString()}`, req.file.filename, req.file.path]
        );

        res.json({
            success: true,
            message: 'Voice alert uploaded successfully',
            voiceAlert: {
                id: voiceAlertId,
                name: alertName,
                file_name: req.file.filename
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

// NEW: Get single voice alert by id
app.get('/api/voice/:id', async (req, res) => {
    try {
        const voiceId = req.params.id;
        const userId = req.headers['user-id'];
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User ID required'
            });
        }

        const [rows] = await db.execute(
            'SELECT * FROM voice_alerts WHERE id = ? AND user_id = ?',
            [voiceId, userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Voice alert not found'
            });
        }

        res.json({
            success: true,
            voiceAlert: rows[0]
        });
    } catch (error) {
        console.error('Get voice by id error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch voice alert'
        });
    }
});

// Medicine Routes - FIXED with time validation
app.post('/api/medicines', upload.fields([
    { name: 'medicinePhoto', maxCount: 1 },
    { name: 'voiceFile', maxCount: 1 }
]), async (req, res) => {
    try {
        const { 
            name, dosage, frequency,
            medicineTime1, medicineTime2, medicineTime3,
            stock, refill_reminder, voice_alert_type, alertName,
            duration_type, duration_days
        } = req.body;
        const userId = req.headers['user-id'];

        if (!userId)
            return res.status(401).json({ success: false, message: 'User ID required' });

        if (!name || !dosage || !medicineTime1)
            return res.status(400).json({ success: false, message: 'Name, dosage and at least one time are required' });

        // validate times
        let times = [medicineTime1];
        if (frequency === 'twice' && medicineTime2) times.push(medicineTime2);
        else if (frequency === 'thrice' && medicineTime2 && medicineTime3) times.push(medicineTime2, medicineTime3);
        for (let t of times)
            if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(t))
                return res.status(400).json({ success: false, message: `Invalid time format (${t})` });

        // ✅ compute start / end date
        const startDate = new Date();
        let endDate = null;
        if (duration_type === 'week') {
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 7);
        } else if (duration_type === 'custom' && duration_days) {
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + parseInt(duration_days));
        }

        // ✅ share same photo for all reminders
        const photoName = req.files?.medicinePhoto?.[0]?.filename || null;

        // ✅ share same voice for all reminders
        let voiceAlertId = null;
        if (req.files?.voiceFile) {
            const vf = req.files.voiceFile[0];
            voiceAlertId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            await db.execute(
                'INSERT INTO voice_alerts (id,user_id,name,file_name,file_path) VALUES (?,?,?,?,?)',
                [voiceAlertId, userId, alertName || `Voice for ${name}`, vf.filename, vf.path]
            );
        }

        // ✅ create medicines
        const ids = [];
        for (let i = 0; i < times.length; i++) {
            const medId = Date.now().toString() + i + Math.random().toString(36).substr(2, 5);
            await db.execute(
                `INSERT INTO medicines 
                (id,user_id,name,dosage,time,frequency,stock,refill_reminder,
                 voice_alert_type,voice_alert_id,medicine_photo,status,
                 duration_type,duration_days,start_date,end_date)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    medId, userId, i === 0 ? name : `${name} (Time ${i + 1})`,
                    dosage, times[i], frequency, stock, refill_reminder,
                    voice_alert_type, voiceAlertId, photoName, 'pending',
                    duration_type || 'lifetime',
                    duration_days || null,
                    startDate.toISOString().split('T')[0],
                    endDate ? endDate.toISOString().split('T')[0] : null
                ]
            );
            ids.push(medId);
        }

        res.status(201).json({
            success: true,
            message: `Medicine added with ${times.length} reminder(s)`,
            medicineIds: ids
        });

    } catch (error) {
        console.error('Add medicine error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add medicine'
        });
    }
});

// Get all medicines
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
            'SELECT * FROM medicines WHERE user_id = ? ORDER BY time',
            [userId]
        );

        // Calculate days left for each medicine
        for (const m of medicines) {
            if (m.end_date) {
                const diff = Math.ceil((new Date(m.end_date) - new Date()) / (1000 * 60 * 60 * 24));
                m.days_left = diff >= 0 ? diff : 0;
            } else {
                m.days_left = null;
            }
        }

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

        if (req.files && req.files['medicinePhoto']) {
            medicinePhoto = req.files['medicinePhoto'][0].filename;
        }

        if (req.files && req.files['voiceFile']) {
            const voiceFile = req.files['voiceFile'][0];
            voiceAlertId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            
            await db.execute(
                'INSERT INTO voice_alerts (id, user_id, name, file_name, file_path) VALUES (?, ?, ?, ?, ?)',
                [voiceAlertId, userId, alertName || `Voice for ${name}`, voiceFile.filename, voiceFile.path]
            );
        }

        await db.execute(
            `UPDATE medicines SET 
             name = ?, dosage = ?, time = ?, frequency = ?, stock = ?, refill_reminder = ?,
             voice_alert_type = ?, voice_alert_id = ?, medicine_photo = ?
             WHERE id = ? AND user_id = ?`,
            [name, dosage, time, frequency, stock, refill_reminder, 
             voice_alert_type, voiceAlertId, medicinePhoto, medicineId, userId]
        );

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

// Mark medicine as taken
app.post('/api/medicines/:id/taken', async (req, res) => {
    try {
        const medicineId = req.params.id;
        const { notes } = req.body;
        const userId = req.headers['user-id'];
        if (!userId) return res.status(401).json({ success: false, message: 'User ID required' });

        const [rows] = await db.execute('SELECT * FROM medicines WHERE id = ? AND user_id = ?', [medicineId, userId]);
        if (rows.length === 0)
            return res.status(404).json({ success: false, message: 'Medicine not found' });
        const med = rows[0];

        if (med.status === 'taken')
            return res.json({ success: true, message: 'Already marked taken' });

        // ✅ reduce by dosage
        const dosageInt = parseInt(med.dosage) || 1;
        const newStock = Math.max(0, med.stock - dosageInt);

        // ✅ Update all medicines with the same name for this user
// ✅ 1. Reduce stock for all same medicines (shared stock)
await db.execute(`
    UPDATE medicines 
    SET stock = ? 
    WHERE user_id = ? AND name LIKE ?
`, [newStock, userId, `${med.name.split(' ')[0]}%`]);

// ✅ 2. Mark only the current medicine as "taken"
await db.execute(`
    UPDATE medicines 
    SET status = "taken", taken_at = CURRENT_TIMESTAMP 
    WHERE id = ? AND user_id = ?
`, [medicineId, userId]);


        // ✅ add to history
        const hid = Date.now().toString() + Math.random().toString(36).substr(2, 8);
        const actualTime = new Date().toISOString().slice(0, 16).replace('T', ' ');
        await db.execute(
            'INSERT INTO history (id,user_id,medicine_id,medicine_name,dosage,scheduled_time,actual_time,status,notes) VALUES (?,?,?,?,?,?,?,?,?)',
            [hid, userId, medicineId, med.name, med.dosage, med.time, actualTime, 'taken', notes || '']
        );

        res.json({ success: true, message: `Stock reduced by ${dosageInt}. Remaining: ${newStock}` });
    } catch (err) {
        console.error('Taken error:', err);
        res.status(500).json({ success: false, message: 'Failed to update' });
    }
});

// Reschedule medicine
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

        // FIXED: compute new HH:MM time from remindInMinutes and update the medicine record
        const minutes = parseInt(remindInMinutes, 10);
        if (isNaN(minutes) || minutes < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid remindInMinutes'
            });
        }

        const newDate = new Date(Date.now() + minutes * 60 * 1000);
        const hh = String(newDate.getHours()).padStart(2, '0');
        const mm = String(newDate.getMinutes()).padStart(2, '0');
        const newTime = `${hh}:${mm}`;

        // Update medicine time so the dashboard will reflect the rescheduled time
        await db.execute(
            'UPDATE medicines SET time = ?, status = "pending" WHERE id = ? AND user_id = ?',
            [newTime, medicineId, userId]
        );

        // Clear current reminder
        activeReminders.delete(medicineId);

        // Add to history as rescheduled
        const historyId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

        await db.execute(
            `INSERT INTO history (id, user_id, medicine_id, medicine_name, dosage, scheduled_time, 
             actual_time, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [historyId, userId, medicineId, medicine.name, medicine.dosage, medicine.time,
             null, 'rescheduled', `Rescheduled for ${minutes} minutes later (new time: ${newTime})`]
        );

        res.json({
            success: true,
            message: `Medicine will remind you again in ${minutes} minutes`,
            newTime
        });

    } catch (error) {
        console.error('Reschedule error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reschedule medicine'
        });
    }
});

// Delete medicine
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

        activeReminders.delete(medicineId);

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

        if (req.file) {
            profile_photo = req.file.filename;
        }

        await db.execute(
            `UPDATE users SET name = ?, age = ?, medical_history = ?, guardian_name = ?, 
             guardian_contact = ?, profile_photo = ? WHERE id = ?`,
            [name, age, medical_history, guardian_name, guardian_contact, profile_photo, userId]
        );

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

// History Routes
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

        if (range !== 'all') {
            const days = parseInt(range);
            query += ' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
            params.push(days);
        }

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

// Export history
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
            const actualTime = record.actual_time && record.actual_time !== 'null' ? 
                record.actual_time : '-';
            
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

// ✅ Get all low stock medicines
app.get('/api/low-stock', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        if (!userId) return res.status(401).json({ success: false, message: 'User ID required' });

        const [rows] = await db.execute(`
            SELECT * FROM medicines 
            WHERE user_id = ? AND stock <= refill_reminder AND stock > 0
        `, [userId]);

        res.json({ success: true, medicines: rows });
    } catch (err) {
        console.error('Error fetching low stock:', err);
        res.status(500).json({ success: false, message: 'Failed to load low stock medicines' });
    }
});

// ✅ Get missed medicines (not taken after 12 hours)
app.get('/api/missed', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        if (!userId) return res.status(401).json({ success: false, message: 'User ID required' });

        // Mark medicines as missed automatically
        await db.execute(`
            UPDATE medicines 
            SET status = 'missed'
            WHERE user_id = ? AND status = 'pending' 
            AND TIMESTAMPDIFF(HOUR, time, CURRENT_TIME()) >= 12
        `, [userId]);

        const [rows] = await db.execute(`
            SELECT * FROM medicines 
            WHERE user_id = ? AND status = 'missed'
        `, [userId]);

        res.json({ success: true, medicines: rows });
    } catch (err) {
        console.error('Error fetching missed medicines:', err);
        res.status(500).json({ success: false, message: 'Failed to load missed medicines' });
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
// 🧹 Daily cleanup for expired medicines
setInterval(async () => {
  try {
    console.log("🧹 Checking for expired medicines...");
    const [expired] = await db.execute(
      'SELECT * FROM medicines WHERE end_date IS NOT NULL AND end_date < CURDATE()'
    );

    if (expired.length > 0) {
      for (const med of expired) {
        await db.execute(
          'INSERT INTO history (user_id, medicine_name, dosage, scheduled_time, actual_time, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [med.user_id, med.name, med.dosage, med.time, new Date(), 'expired', 'Medicine duration ended']
        );
        await db.execute('DELETE FROM medicines WHERE id = ?', [med.id]);
      }
      console.log(`🗑️ ${expired.length} expired medicines removed.`);
    }
  } catch (err) {
    console.error('❌ Cleanup error:', err);
  }
}, 24 * 60 * 60 * 1000); // every 24h


// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 MediTrack Pro server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  //  console.log(`🌐 Frontend: http://localhost:${PORT}/`);
    console.log(`💾 Database: MySQL connected`);
    //console.log(`⏰ Reminder checker running every 30 seconds`);
});