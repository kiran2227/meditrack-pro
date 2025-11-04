const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Simple in-memory storage
let users = [];
let medicines = [];
let history = [];

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Created uploads directory');
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'MediTrack Pro API is running!',
        timestamp: new Date().toISOString()
    });
});

// Auth Routes
app.post('/api/auth/register', (req, res) => {
    try {
        const { name, email, password, age, medical_history, guardian_name, guardian_contact } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and password are required'
            });
        }

        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        const user = {
            id: Date.now().toString(),
            name,
            email,
            password,
            age: age || null,
            medical_history: medical_history || null,
            guardian_name: guardian_name || null,
            guardian_contact: guardian_contact || null,
            created_at: new Date().toISOString()
        };

        users.push(user);

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
                guardian_contact: user.guardian_contact
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

app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const user = users.find(user => user.email === email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

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
                guardian_contact: user.guardian_contact
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

// Medicine Routes
app.get('/api/medicines', (req, res) => {
    try {
        const userId = req.headers['user-id'];
        const userMedicines = medicines.filter(med => med.user_id === userId);
        
        res.json({
            success: true,
            medicines: userMedicines
        });
    } catch (error) {
        console.error('Get medicines error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch medicines'
        });
    }
});

app.post('/api/medicines', (req, res) => {
    try {
        const { name, dosage, time, frequency, stock, refill_reminder } = req.body;
        const userId = req.headers['user-id'];

        if (!name || !dosage || !time) {
            return res.status(400).json({
                success: false,
                message: 'Name, dosage and time are required'
            });
        }

        const medicine = {
            id: Date.now().toString(),
            user_id: userId,
            name,
            dosage,
            time,
            frequency: frequency || 'once',
            stock: stock || 0,
            refill_reminder: refill_reminder || 0,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        medicines.push(medicine);

        res.status(201).json({
            success: true,
            message: 'Medicine added successfully',
            medicine
        });

    } catch (error) {
        console.error('Add medicine error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add medicine'
        });
    }
});

app.post('/api/medicines/:id/taken', (req, res) => {
    try {
        const medicineId = req.params.id;
        const { notes } = req.body;

        const medicine = medicines.find(med => med.id === medicineId);
        if (!medicine) {
            return res.status(404).json({
                success: false,
                message: 'Medicine not found'
            });
        }

        medicine.status = 'taken';
        medicine.taken_at = new Date().toISOString();

        // Add to history
        const historyEntry = {
            id: Date.now().toString(),
            user_id: medicine.user_id,
            medicine_id: medicineId,
            medicine_name: medicine.name,
            dosage: medicine.dosage,
            scheduled_time: medicine.time,
            actual_time: new Date().toISOString(),
            status: 'taken',
            notes: notes || '',
            created_at: new Date().toISOString()
        };
        history.push(historyEntry);

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

app.delete('/api/medicines/:id', (req, res) => {
    try {
        const medicineId = req.params.id;
        const medicineIndex = medicines.findIndex(med => med.id === medicineId);

        if (medicineIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Medicine not found'
            });
        }

        medicines.splice(medicineIndex, 1);

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
app.get('/api/users/profile', (req, res) => {
    try {
        const userId = req.headers['user-id'];
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                age: user.age,
                medical_history: user.medical_history,
                guardian_name: user.guardian_name,
                guardian_contact: user.guardian_contact
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

app.put('/api/users/profile', (req, res) => {
    try {
        const userId = req.headers['user-id'];
        const { name, age, medical_history, guardian_name, guardian_contact } = req.body;

        const user = users.find(u => u.id === userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.name = name;
        user.age = age;
        user.medical_history = medical_history;
        user.guardian_name = guardian_name;
        user.guardian_contact = guardian_contact;

        res.json({
            success: true,
            message: 'Profile updated successfully'
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
app.get('/api/history', (req, res) => {
    try {
        const userId = req.headers['user-id'];
        const userHistory = history.filter(h => h.user_id === userId);
        
        // Sort by date (newest first)
        userHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json({
            success: true,
            history: userHistory
        });

    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch history'
        });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 MediTrack Pro server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌐 Frontend: http://localhost:${PORT}/`);
    console.log(`\n💾 Storage: In-memory (data resets on server restart)`);
    console.log(`👤 Sample users: ${users.length}`);
    console.log(`💊 Sample medicines: ${medicines.length}`);
});