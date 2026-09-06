const express = require('express');
const router = express.Router();
const { login, getMe, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireFields } = require('../middleware/validateMiddleware');

// Public route
router.post('/login', requireFields(['email', 'password']), login);

// Protected routes
router.use(authenticate);
router.get('/me', getMe);
router.post('/change-password', requireFields(['currentPassword', 'newPassword']), changePassword);

module.exports = router;
