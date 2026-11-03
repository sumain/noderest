
const User = require('../models/userModel');
const bcrypt = require('bcrypt');

// Get all users
const getAllUsers = async (req, res) => {
    try {
        const users = await User.getAllUsers();

        return res.status(200).json({
            success: true,
            message: 'Users retrieved successfully',
            data: users
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get user by ID
const getUserById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        const user = await User.getUserById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Create user
const createUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and password are required'
            });
        }

        if (typeof name !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !name.trim() || !email.trim() ||
            password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input or password must be at least 8 characters'
            });
        }

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 12);

        const userId = await User.createUser({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword
        });

        return res.status(201).json({
            success: true,
            message: 'User created successfully',
            user_id: userId
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Email already exists'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Update user
const updateUser = async (req, res) => {
    try {
        const id = Number(req.params.id);

        // Validate user ID
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        const { name, email } = req.body;

        // Only allow these fields
        const allowedFields = ['name', 'email'];

        const receivedFields = Object.keys(req.body);

        const invalidFields = receivedFields.filter(
            field => !allowedFields.includes(field)
        );

        if (invalidFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid fields provided',
                invalid_fields: invalidFields
            });
        }

        // Empty request body validation
        if (receivedFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide at least one field to update'
            });
        }

        // Validate name if provided
        if (
            name !== undefined &&
            (typeof name !== 'string' || !name.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: 'Name must be a valid string'
            });
        }

        // Validate email if provided
        if (
            email !== undefined &&
            (
                typeof email !== 'string' ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
            )
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        // Check user exists
        const existingUser = await User.getUserById(id);

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prepare update data
        const updateData = {};

        if (name !== undefined) {
            updateData.name = name.trim();
        }

        if (email !== undefined) {
            const newEmail = email.trim().toLowerCase();

            // Check only when email changes
            if (newEmail !== existingUser.email) {

                const emailExists = await User.checkEmailExists(
                    newEmail,
                    id
                );

                if (emailExists) {
                    return res.status(409).json({
                        success: false,
                        message: 'Email already exists'
                    });
                }
            }

            updateData.email = newEmail;
        }

        // Update database
        await User.updateUser(id, updateData);

        // Get updated user
        const updatedUser = await User.getUserById(id);

        return res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        });

    } catch (error) {

        // Database unique constraint protection
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Email already exists'
            });
        }

        console.error('Update User Error:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Delete user
const deleteUser = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        const affectedRows = await User.deleteUser(id);

        if (affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
};
