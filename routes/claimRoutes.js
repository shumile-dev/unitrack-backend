const express = require('express');
const router = express.Router();
const Claim = require('../models/claim');
const Blog = require('../models/blog');
const auth = require('../middlewares/auth');

// Submit a new claim
router.post('/', auth, async (req, res) => {
    try {
        const { itemId, claimantName, claimantPhone, claimHints } = req.body;

        // Check if item exists
        const item = await Blog.findById(itemId);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        // Check if user has already claimed this item
        const existingClaim = await Claim.findOne({ 
            itemId, 
            claimant: req.user._id 
        });
        if (existingClaim) {
            return res.status(400).json({ message: 'You have already claimed this item' });
        }

        // Create new claim
        const newClaim = new Claim({
            itemId,
            claimantName,
            claimantPhone,
            claimHints,
            claimant: req.user._id,
            status: 'pending'
        });

        await newClaim.save();
        res.status(201).json(newClaim);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting claim', error: error.message });
    }
});

// Get claims for a specific item
router.get('/item/:id', auth, async (req, res) => {
    try {
        const claims = await Claim.find({ itemId: req.params.id })
            .populate('claimant', 'username email')
            .sort('-createdAt');
        res.json(claims);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching claims', error: error.message });
    }
});

// Get claims made by the current user
router.get('/my-claims', auth, async (req, res) => {
    try {
        const claims = await Claim.find({ claimant: req.user._id })
            .populate('itemId')
            .sort('-createdAt');
        res.json(claims);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching your claims', error: error.message });
    }
});

// Get claims for items posted by the current user
router.get('/received-claims', auth, async (req, res) => {
    try {
        // First get all items posted by the user
        const userItems = await Blog.find({ author: req.user._id });
        const itemIds = userItems.map(item => item._id);
        
        // Then get all claims for these items
        const claims = await Claim.find({ itemId: { $in: itemIds } })
            .populate('claimant', 'username email')
            .populate('itemId')
            .sort('-createdAt');
        res.json(claims);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching received claims', error: error.message });
    }
});

// Approve a claim
router.put('/:id/approve', auth, async (req, res) => {
    try {
        const claim = await Claim.findById(req.params.id);
        if (!claim) {
            return res.status(404).json({ message: 'Claim not found' });
        }

        // Update claim status
        claim.status = 'approved';
        await claim.save();

        // Update item as resolved
        await Blog.findByIdAndUpdate(claim.itemId, {
            isResolved: true,
            resolvedClaim: claim._id
        });

        res.json(claim);
    } catch (error) {
        res.status(500).json({ message: 'Error approving claim', error: error.message });
    }
});

module.exports = router;