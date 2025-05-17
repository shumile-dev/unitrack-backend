const User = require('../models/user');

/**
 * Middleware to check if the authenticated user has admin role
 * This middleware should be used after the auth middleware
 */
const adminAuth = async (req, res, next) => {
    try {
        // req.user is set by the auth middleware
        if (!req.user) {
            const error = {
                status: 401,
                message: 'Unauthorized - Authentication required'
            };
            return next(error);
        }

        // Get user from database to ensure we have the latest role information
        const user = await User.findById(req.user._id);
        
        if (!user) {
            const error = {
                status: 404,
                message: 'User not found'
            };
            return next(error);
        }

        // Check if user has admin role
        if (user.role !== 'admin') {
            const error = {
                status: 403,
                message: 'Forbidden - Admin access required'
            };
            return next(error);
        }

        // User is an admin, proceed to the next middleware or route handler
        next();
    } catch (error) {
        console.log('Admin middleware error:', error.message);
        return next(error);
    }
};

module.exports = adminAuth; 