const express = require('express');
const authController = require('../controller/authController');
const blogController = require('../controller/blogController');
const locationController = require('../controller/locationController');
const upload = require('../middlewares/multer');
const auth = require('../middlewares/auth');
const User = require('../models/user');

const router = express.Router();
router.get('/', (req, res) => {
    console.log("working");
    res.status(200).json({
        message: "working"
    });
});

// user

// register
router.post('/register', authController.register);

// Admin-only user registration
router.post('/admin/register', auth, async (req, res, next) => {
  try {
    // Check if the current user is an admin
    const currentUser = await User.findById(req.user._id);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized: Admin privileges required' });
    }
    
    // Call the register controller with admin privileges
    // This will allow setting any role including 'admin'
    return authController.register(req, res, next);
  } catch (error) {
    return res.status(500).json({ 
      message: 'Error creating user',
      error: error.message 
    });
  }
});

// login
router.post('/login', authController.login);

// logout
router.post('/logout', auth, authController.logout);

// get user by ID
router.get('/users/:id', authController.getUserById);

//all uses
router.get('/users',authController.getAllUser)

// refresh
router.get('/refresh', authController.refresh);

// update profile image
router.post(
  '/updateProfileImage/:id',
  
  upload.single('profileImage'), // expecting the field name as 'profileImage'
  authController.updateProfileImage
);

// For image upload
router.post('/updateProfileImage/:id', upload.single('profileImage'), async (req, res) => {
  try {
    const userId = req.params.id;
    const file = req.file;
    
    // Process the file (save to cloud storage or local filesystem)
    const imageUrl = await saveImage(file); // Your implementation
    
    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profileImage: imageUrl },
      { new: true }
    );
    
    res.json({ 
      user: updatedUser,
      auth: true 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// For user data update
router.put('/users/:id',authController.updateUser )
// Delete user
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
// get profile img
router.get('/users/:userId/profile-image', auth, authController.getProfileImage);

//location
router.post('/save-location', auth, locationController.saveLocation); // Add this line

// blog

// create
router.post('/blog',  upload.single('photoPath'),blogController.create);
// router.post('/blog', blogController.create);

// get all
// router.get('/blog/all', auth, blogController.getAll);
router.get('/blog/all', blogController.getAll);

//search 
router.get('/search',blogController.searchByName)

// get blog by id
router.get('/blog/:id', blogController.getById);
// router.get('/blog/:id', blogController.getById);

//get blog by author
router.get("/blogs/author/:authorId", blogController.getByAuthor);
// update
router.put('/blog', upload.single('photoPath'), blogController.update);
// delete
// router.delete('/blog/:id', auth, blogController.delete);
router.delete('/blog/:id', blogController.delete);

// forgot password
router.post('/forgot-password', authController.forgotPassword);

// verify OTP
router.post('/verify-otp', authController.verifyOTP);

// reset password
router.post('/reset-password', authController.resetPassword);

// verify reset token
router.get('/verify-reset-token/:token', authController.verifyResetToken);

// reset password with token
router.post('/reset-password-with-token', authController.resetPasswordWithToken);

module.exports = router;