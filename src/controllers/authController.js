
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const User = require('../models/userModel');
const Auth = require('../models/authModel');

const {
    generateAccessToken,
    generateRefreshToken
} = require('../utils/token');

// Hash refresh token before database storage
const hashToken = (token) => {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
};

// Convert JWT expiration into MySQL datetime
const getRefreshExpiry = () => {
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return expiry.toISOString().slice(0, 19).replace('T', ' ');
};

// Register
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (
            typeof name !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !name.trim() ||
            !email.trim() ||
            password.length < 8
        ) {
            return res.status(400).json({
                success: false,
                message: 'Valid name, email and password (minimum 8 characters) are required'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await Auth.findUserByEmail(
            normalizedEmail
        );

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Email already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const userId = await User.createUser({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword
        });

        return res.status(201).json({
            success: true,
            message: 'Registration successful',
            user_id: userId
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Email already exists'
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const user = await Auth.findUserByEmail(
            email.trim().toLowerCase()
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        if (user.status !== 1) {
            return res.status(403).json({
                success: false,
                message: 'Your account is inactive'
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Save only refresh token hash
        await Auth.createRefreshSession(
            user.id,
            hashToken(refreshToken),
            getRefreshExpiry()
        );

        return res.status(200).json({
            success: true,
            message: 'Login successful',

            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },

                access_token: accessToken,
                refresh_token: refreshToken,
                token_type: 'Bearer',
                expires_in: 900
            }
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const refreshAccessToken = async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (
            typeof refresh_token !== 'string' ||
            !refresh_token
        ) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        // Verify refresh JWT
        const decoded = jwt.verify(
            refresh_token,
            process.env.JWT_REFRESH_SECRET,
            {
                issuer: 'node-rest-api',
                audience: 'node-rest-api-client'
            }
        );

        if (
            decoded.type !== 'refresh' ||
            !decoded.sub
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        const userId = Number(decoded.sub);

        if (!Number.isSafeInteger(userId) || userId <= 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        // Check user still exists and is active
        const user = await User.getUserById(userId);

        if (!user || user.status !== 1) {
            return res.status(401).json({
                success: false,
                message: 'User account is unavailable'
            });
        }

        // Generate replacement tokens
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        // Atomically replace the old refresh session
        const rotated = await Auth.rotateRefreshSession(
            userId,
            hashToken(refresh_token),
            hashToken(newRefreshToken),
            getRefreshExpiry()
        );

        if (!rotated) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token is expired, revoked or already used'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                access_token: newAccessToken,
                refresh_token: newRefreshToken,
                token_type: 'Bearer',
                expires_in: 900
            }
        });

    } catch (error) {

        if (
            error.name === 'TokenExpiredError' ||
            error.name === 'JsonWebTokenError' ||
            error.name === 'NotBeforeError'
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token'
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};



const logout = async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (
            typeof refresh_token !== 'string' ||
            !refresh_token
        ) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(
            refresh_token,
            process.env.JWT_REFRESH_SECRET,
            {
                issuer: 'node-rest-api',
                audience: 'node-rest-api-client'
            }
        );

        if (
            decoded.type !== 'refresh' ||
            !decoded.sub
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        const userId = Number(decoded.sub);

        const revoked = await Auth.revokeRefreshSession(
            userId,
            hashToken(refresh_token)
        );

        return res.status(200).json({
            success: true,
            message: revoked
                ? 'Logout successful'
                : 'Session already revoked'
        });

    } catch (error) {
        if (
            error.name === 'TokenExpiredError' ||
            error.name === 'JsonWebTokenError' ||
            error.name === 'NotBeforeError'
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token'
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    register,
    login,
    refreshAccessToken,
    logout
};