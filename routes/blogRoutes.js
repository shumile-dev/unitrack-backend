const express = require('express');
const router = express.Router();
const Claim = require('../models/claim');
const Blog = require('../models/blog');
const auth = require('../middlewares/auth');
const blogController = require('../controller/blogController');

// Get resolved items
router.get('/resolved', auth, async (req, res) => {
  try {
    const resolvedItems = await Blog.find({ isResolved: true })
      .populate('author', 'username email')
      .populate('resolvedClaim')
      .sort('-updatedAt');
    res.json(resolvedItems);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching resolved items', error: error.message });
  }
});

// Get a single item by ID
router.get('/:id', blogController.getById);

module.exports = router; 