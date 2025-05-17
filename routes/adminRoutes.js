const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const blogController = require('../controller/blogController');
const auth = require('../middlewares/auth');
const adminAuth = require('../middlewares/admin');
const User = require('../models/user');
const Blog = require('../models/blog');

// Apply auth and admin middleware to all routes in this router
router.use(auth, adminAuth);

// User management routes
router.get('/users', authController.getAllUser);

// Get a specific user
router.get('/users/:id', authController.getUserById);

// Update a user
router.put('/users/:id', authController.updateUser);

// Delete a user
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        return res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        return res.status(500).json({ 
            message: 'Error deleting user',
            error: error.message 
        });
    }
});

// Blog management routes
router.get('/blogs', blogController.getAll);

// Get a specific blog
router.get('/blogs/:id', blogController.getById);

// Update a blog
router.put('/blogs', blogController.update);

// Delete a blog
router.delete('/blogs/:id', blogController.delete);

// Block/Unblock a blog
router.put('/blogs/:id/block', authController.block);

router.put('/blogs/:id/unblock', async (req, res) => {
    try {
        const post = await Blog.findByIdAndUpdate(
            req.params.id,
            { isBlocked: false },
            { new: true }
        );
        
        if (!post) return res.status(404).json({ message: "Post not found" });
        
        res.json({ message: "Post unblocked", post });
    } catch (err) {
        console.error("Unblock error:", err);
        res.status(500).json({ message: "Error unblocking post" });
    }
});

// Stats and dashboard data
router.get('/stats', async (req, res) => {
    try {
        const usersCount = await User.countDocuments();
        const postsCount = await Blog.countDocuments();
        const lostItemsCount = await Blog.countDocuments({ type: 'lost' });
        const foundItemsCount = await Blog.countDocuments({ type: 'found' });
        const blockedPostsCount = await Blog.countDocuments({ isBlocked: true });
        
        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('-password');
            
        const recentPosts = await Blog.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('author', 'name email');
            
        res.json({
            stats: {
                usersCount,
                postsCount,
                lostItemsCount,
                foundItemsCount,
                blockedPostsCount
            },
            recentUsers,
            recentPosts
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching stats', error: err.message });
    }
});

module.exports = router; 