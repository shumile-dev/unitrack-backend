const JWTService = require('../services/JWTService');
const User = require('../models/user');
const UserDTO = require('../dto/user');

const auth = async (req, res, next) => {
    try {
        // First check for cookies
        const {refreshToken, accessToken} = req.cookies || {};
        
        // Also check for Authorization header (for API requests)
        const authHeader = req.headers.authorization;
        
        // If neither cookies nor Authorization header exists, return error
        if ((!refreshToken || !accessToken) && !authHeader) {
            console.log('No authentication tokens found');
            const error = {
                status: 401,
                message: 'Unauthorized - No authentication tokens provided'
            }
            return next(error);
        }
        
        let _id;
        
        // If cookies are present, try to verify access token from cookies
        if (refreshToken && accessToken) {
            try {
                _id = JWTService.verifyAccessToken(accessToken)._id;
            } catch (error) {
                console.log('Cookie token verification failed:', error.message);
                // Continue to check Authorization header if cookie verification fails
            }
        }
        
        // If no _id yet and Authorization header exists, try to extract token
        if (!_id && authHeader) {
            try {
                // Expected format: "Bearer <token>"
                const token = authHeader.split(' ')[1];
                if (!token) {
                    throw new Error('Invalid Authorization header format');
                }
                
                // Verify the token
                _id = JWTService.verifyAccessToken(token)._id;
            } catch (error) {
                console.log('Auth header token verification failed:', error.message);
                const err = {
                    status: 401,
                    message: 'Invalid or expired token'
                };
                return next(err);
            }
        }
        
        // If we still don't have an _id, all authentication methods failed
        if (!_id) {
            const error = {
                status: 401,
                message: 'Authentication failed'
            };
            return next(error);
        }

        // Find user by ID
        let user;
        try {
            user = await User.findOne({_id: _id});
            if (!user) {
                throw new Error('User not found');
            }
        } catch (error) {
            console.log('User lookup failed:', error.message);
            return next(error);
        }

        const userDto = new UserDTO(user);
        req.user = userDto;
        next();
    } catch (error) {
        console.log('Auth middleware error:', error.message);
        return next(error);
    }
}

module.exports = auth;