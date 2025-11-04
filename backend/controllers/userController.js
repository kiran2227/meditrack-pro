const User = require('../models/User');

class UserController {
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        user
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile'
      });
    }
  }

  static async updateProfile(req, res) {
    try {
      const { name, age, medical_history, guardian_name, guardian_contact } = req.body;

      await User.updateProfile(req.user.userId, {
        name,
        age,
        medical_history,
        guardian_name,
        guardian_contact
      });

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
  }
}

module.exports = UserController;