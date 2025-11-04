const express = require('express');
const UserController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);

module.exports = router;