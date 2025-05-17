const express = require('express');
const authController = require('../controller/authController');
const auth = require('../middlewares/auth');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', auth, authController.logout);
router.get('/refresh', authController.refresh);

// Password reset routes
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-password', authController.resetPassword);
router.get('/verify-reset-token/:token', authController.verifyResetToken);
router.post('/reset-password-with-token', authController.resetPasswordWithToken);

module.exports = router;
