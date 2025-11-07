// backend/controllers/VoiceController.js
const path = require('path');
const fs = require('fs');
const VoiceAlert = require('../models/VoiceAlert');

class VoiceController {
  // ✅ Upload new voice alert (recorded or uploaded file)
  static async uploadVoiceAlert(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const userId = req.user?.userId || req.headers['user-id'];
      const { medicineId, alertName } = req.body;
      const file = req.file;

      // ✅ Ensure unique filename (timestamp + original extension)
      const uniqueFileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
      const uploadDir = path.join(__dirname, '../uploads/voice-alerts');
      const fullPath = path.join(uploadDir, uniqueFileName);

      // Ensure upload directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Move file to permanent location
      fs.renameSync(file.path, fullPath);

      // Save to DB
      const voiceAlertId = await VoiceAlert.create({
        user_id: userId,
        medicine_id: medicineId || null,
        name: alertName || file.originalname,
        file_name: uniqueFileName,
        file_path: `/uploads/voice-alerts/${uniqueFileName}`,
        is_default: !medicineId
      });

      // ✅ Respond with a full playable URL
      const fileUrl = `http://localhost:5000/uploads/voice-alerts/${uniqueFileName}`;

      res.json({
        success: true,
        message: 'Voice alert uploaded successfully!',
        voiceAlert: {
          id: voiceAlertId,
          file_name: uniqueFileName,
          file_path: fileUrl
        }
      });

    } catch (error) {
      console.error('🚨 Upload voice error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload voice alert. Please try again.'
      });
    }
  }

  // ✅ Get all voice alerts for logged-in user
  static async getVoiceAlerts(req, res) {
    try {
      const userId = req.user?.userId || req.headers['user-id'];
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authorized'
        });
      }

      const voiceAlerts = await VoiceAlert.findByUserId(userId);

      // Attach full URLs for each file (for frontend playback)
      const alertsWithUrl = voiceAlerts.map(alert => ({
        ...alert,
        file_url: `http://localhost:5000/uploads/voice-alerts/${alert.file_name}`
      }));

      res.json({
        success: true,
        voiceAlerts: alertsWithUrl
      });

    } catch (error) {
      console.error('🚨 Get voice alerts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch voice alerts'
      });
    }
  }

  // ✅ Serve actual audio file directly (GET /api/voice/file/:filename)
  static async serveVoiceFile(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, '../uploads/voice-alerts', filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      res.setHeader('Content-Type', 'audio/wav');
      res.sendFile(filePath);

    } catch (error) {
      console.error('🚨 Serve voice file error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to serve voice file'
      });
    }
  }
}

module.exports = VoiceController;
