const path = require('path');
const fs = require('fs');
const VoiceAlert = require('../models/VoiceAlert');

class VoiceController {
  static async uploadVoiceAlert(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const { medicineId } = req.body;
      const file = req.file;

      const voiceAlertId = await VoiceAlert.create({
        user_id: req.user.userId,
        medicine_id: medicineId || null,
        file_name: file.originalname,
        file_path: file.path,
        is_default: !medicineId
      });

      res.json({
        success: true,
        message: 'Voice alert uploaded successfully',
        voiceAlert: {
          id: voiceAlertId,
          file_name: file.originalname,
          file_path: file.path
        }
      });

    } catch (error) {
      console.error('Upload voice error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload voice alert'
      });
    }
  }

  static async getVoiceAlerts(req, res) {
    try {
      const voiceAlerts = await VoiceAlert.findByUserId(req.user.userId);
      res.json({
        success: true,
        voiceAlerts
      });
    } catch (error) {
      console.error('Get voice alerts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch voice alerts'
      });
    }
  }

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

      res.sendFile(filePath);

    } catch (error) {
      console.error('Serve voice file error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to serve voice file'
      });
    }
  }
}

module.exports = VoiceController;