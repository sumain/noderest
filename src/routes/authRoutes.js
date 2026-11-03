
const express = require('express');

const router = express.Router();

const AuthController = require('../controllers/authController');

// Register
router.post('/register', AuthController.register);

// Login
router.post('/login', AuthController.login);

// Refresh access token
router.post('/refresh-token', AuthController.refreshAccessToken);

// Logout
router.post('/logout', AuthController.logout);

module.exports = router;
