
const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {
    return jwt.sign(
        {
            sub: String(user.id),
            role: user.role,
            type: 'access'
        },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRES || '15m',
            issuer: 'noderest',
            audience: 'noderest-client'
        }
    );
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            sub: String(user.id),
            type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRES || '7d',
            issuer: 'noderest',
            audience: 'noderest-client'
        }
    );
};

module.exports = {
    generateAccessToken,
    generateRefreshToken
};
