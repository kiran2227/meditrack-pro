const express = require('express');
const multer = require('multer');
const path = require('path');
const VoiceController = require('../controllers/voiceController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/voice-alerts/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'voice-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

router.use(authMiddleware);

router.post('/upload', upload.single('voiceFile'), VoiceController.uploadVoiceAlert);
router.get('/', VoiceController.getVoiceAlerts);
router.get('/file/:filename', VoiceController.serveVoiceFile);

module.exports = router;