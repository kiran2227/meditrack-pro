// backend/controllers/UserController.js
const path = require('path');
const fs = require('fs');
const User = require('../models/User');

class UserController {
  // ✅ Fetch user profile (GET /api/users/profile)
  static async getProfile(req, res) {
    try {
      const userId = req.user?.userId || req.headers['user-id'];
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authorized'
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Attach full profile photo URL (if exists)
      if (user.profile_photo) {
        user.profile_photo = `http://localhost:5000/uploads/profile-photos/${user.profile_photo}`;
      }

      res.json({
        success: true,
        user
      });

    } catch (error) {
      console.error('🚨 Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile'
      });
    }
  }

  // ✅ Update user profile (PUT /api/users/profile)
  static async updateProfile(req, res) {
    try {
      const userId = req.user?.userId || req.headers['user-id'];
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authorized'
        });
      }

      const { name, age, medical_history, guardian_name, guardian_contact } = req.body;

      // Handle profile photo upload (if provided)
      let profilePhotoFilename = null;
      if (req.file) {
        const file = req.file;
        const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
        const uploadDir = path.join(__dirname, '../uploads/profile-photos');
        const fullPath = path.join(uploadDir, uniqueName);

        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        fs.renameSync(file.path, fullPath);
        profilePhotoFilename = uniqueName;
      }

      // Build updated data
      const updatedData = {
        name,
        age,
        medical_history,
        guardian_name,
        guardian_contact
      };

      if (profilePhotoFilename) {
        updatedData.profile_photo = profilePhotoFilename;
      }

      // Update DB
      await User.updateProfile(userId, updatedData);

      // Fetch the updated user
      const updatedUser = await User.findById(userId);

      if (updatedUser.profile_photo) {
        updatedUser.profile_photo = `http://localhost:5000/uploads/profile-photos/${updatedUser.profile_photo}`;
      }

      res.json({
        success: true,
        message: 'Profile updated successfully!',
        user: updatedUser
      });

    } catch (error) {
      console.error('🚨 Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile. Please try again.'
      });
    }
  }
}

module.exports = UserController;
