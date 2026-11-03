const express = require('express');

const router = express.Router();

const UserController = require('../controllers/userController');
const authenticate = require('../middleware/authMiddleware');

// All routes below require authentication
router.use(authenticate);

// GET all users
router.get('/', UserController.getAllUsers);

// GET single user
router.get('/:id', UserController.getUserById);

// CREATE user
router.post('/', UserController.createUser);

// UPDATE user
router.patch('/:id', UserController.updateUser);

// DELETE user
router.delete('/:id', UserController.deleteUser);

module.exports = router;
