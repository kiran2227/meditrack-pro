const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = 'meditrack-secret-key-2024';

class AuthController {
  static async register(req, res) {
    try {
      const { name, email, password, age, medical_history, guardian_name, guardian_contact } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Name, email and password are required'
        });
      }

      // Check if user exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const userId = await User.create({
        name,
        email,
        password: hashedPassword,
        age,
        medical_history,
        guardian_name,
        guardian_contact
      });

      // Generate token
      const token = jwt.sign(
        { userId, email },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
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
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        token,
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
  }
}

module.exports = AuthController;