
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {

    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required'
            });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET,
            {
                issuer: 'noderest',
                audience: 'noderest-client'
            }
        );

        if (
            decoded.type !== 'access' ||
            !decoded.sub
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid access token'
            });
        }

        req.user = {
            id: Number(decoded.sub),
            role: decoded.role
        };

        next();

    } catch (error) {

        if (
            error.name === 'TokenExpiredError' ||
            error.name === 'JsonWebTokenError' ||
            error.name === 'NotBeforeError'
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired access token'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

module.exports = authenticate;
