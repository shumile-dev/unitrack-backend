const Joi = require("joi");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const UserDTO = require("../dto/user");
const JWTService = require("../services/JWTService");
const RefreshToken = require("../models/token");
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const Blog=require('../models/blog')
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,25}$/;

// Store OTPs in memory (in production, use Redis or a database)
const otpStore = new Map();

// Store reset tokens in memory (in production, use Redis or a database)
const resetTokenStore = new Map();

// Generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate a random token
const generateResetToken = () => {
  return require('crypto').randomBytes(32).toString('hex');
};

// Send OTP via email - Will be configured properly later
const sendOTPEmail = async (email, otp) => {
  // Log OTP for development until email is properly configured
  console.log("\n========================================");
  console.log("📧 OTP FOR", email, ":", otp);
  console.log("========================================\n");
  
  // Return true to simulate successful email sending
  return true;
};

const authController = {
  async register(req, res, next) {
    console.log(req.body);
    // 1. validate user input
    const userRegisterSchema = Joi.object({
      // username: Joi.string().min(5).max(30).required(),
      name: Joi.string().max(30).required(),
      phone: Joi.string().required(),
      email: Joi.string().email().required(),
      password: Joi.string().pattern(passwordPattern).required(),
      confirmPassword: Joi.ref("password"),
      role: Joi.string().valid("buyer","provider", "admin"),
      // New fields from updated User schema
      rollNumber: Joi.string(),
      semester: Joi.string(),
      department: Joi.string(),
      degree: Joi.string()
    });
    const { error } = userRegisterSchema.validate(req.body);

    // 2. if error in validation -> return error via middleware
    if (error) {
      return next(error);
    }

    // 3. if email or username is already registered -> return an error
    const { name, phone, email, password, role, rollNumber, semester, department, degree } = req.body;

    try {
      const emailInUse = await User.exists({ email });

      // const usernameInUse = await User.exists({ username });
      
      const usernameInUse = await User.exists({ name });

      if (emailInUse) {
        const error = {
          status: 409,
          message: "Email already registered, use another email!",
        };

        return next(error);
      }

      if (usernameInUse) {
        const error = {
          status: 409,
          message: "Name not available, choose another Name!",
        };

        return next(error);
      }
    } catch (error) {
      return next(error);
    }

    // 4. password hash
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. store user data in db
    let accessToken;
    let refreshToken;
    let user;


    try {
      const userToRegister = new User({
        // username,
        email,
        name,
        phone,
        password: hashedPassword,
        role,
        // Add new fields from schema
        rollNumber,
        semester,
        department,
        degree
      });

      user = await userToRegister.save();

      // token generation

      accessToken = JWTService.signAccessToken({ _id: user._id }, "300000m");
      refreshToken = JWTService.signRefreshToken({ _id: user._id }, "600000m");

      // res.status(200).json(
      //   {
      //     message:"User created Successfully"
      //   }
      // )

    } 
    catch (error) {
      return next(error);
    }

    // store refresh token in db
    await JWTService.storeRefreshToken(refreshToken, user._id);

    // send tokens in cookie
    res.cookie("accessToken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });

    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });

    // // 6. response send

    const userDto = new UserDTO(user);

    return res.status(200).json({ user: userDto, auth: true });
  },
  async login(req, res, next) {
    // 1. validate user input
    // 2. if validation error, return error
    // 3. match username and password
    // 4. return response

    // we expect input data to be in such shape
    
    const userLoginSchema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().pattern(passwordPattern),
    });

    const { error } = userLoginSchema.validate(req.body);

    if (error) {
      return next(error);
    }
console.log(req.body)
    const { email, password } = req.body;

    // const username = req.body.username
    // const password = req.body.password

    let user;

    try {
      // match username
      user = await User.findOne({ email: email });

      if (!user) {
        const error = {
          status: 401,
          message: "Invalid email or user not found",
        };

        return next(error);
      }

      // match password
      // req.body.password -> hash -> match

      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        const error = {
          status: 401,
          message: "Invalid password",
        };

        return next(error);
      }
    } catch (error) {
      return next(error);
    }

    const accessToken = JWTService.signAccessToken({ _id: user._id }, "300000m");
    const refreshToken = JWTService.signRefreshToken({ _id: user._id }, "600000m");

    // update refresh token in database
    try {
      await RefreshToken.updateOne(
        {
          _id: user._id,
        },
        { token: refreshToken },
        { upsert: true }
      );
    } catch (error) {
      return next(error);
    }

    res.cookie("accessToken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: true,
    });

    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: true,
    });

    const userDto = new UserDTO(user);
    console.log('response', user);
    return res.status(200).json({ user: userDto, auth: true, accessToken });
  },
  async logout(req, res, next) {
    // 1. delete refresh token from db
    const { refreshToken } = req.cookies;

    try {
      await RefreshToken.deleteOne({ token: refreshToken });
    } catch (error) {
      return next(error);
    }

    // delete cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    // 2. response
    res.status(200).json({ user: null, auth: false });
  },
  async getUserById(req, res, next) {
    try {
      const userId = req.params.id;
      console.log('Fetching user by ID:', userId);

      // Optional: validate ObjectId if using MongoDB
      // const isValidId = mongoose.Types.ObjectId.isValid(userId);
      // if (!isValidId) return res.status(400).json({ message: 'Invalid user ID' });

      const user = await User.findById(userId).select('-password'); // Exclude password field

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json(user);
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      next(error); // pass to error handler middleware
    }
  },
  async block(req, res, next) {
    try {
      console.log('blo');
      const post = await Blog.findByIdAndUpdate(
        req.params.id,
        { isBlocked: true },
        { new: true }
      );
      console.log('post', post);
      
      if (!post) return res.status(404).json({ message: "Post not found" });
      
      res.json({ message: "Post blocked", post });
    } catch (err) {
      console.error("Block error:", err); // Better debug
      res.status(500).json({ message: "Error blocking post" });
    }
  },
  async getAllUser(req, res, next) {
    try {
    //   console.log('gettinggggg')
    // if (req.user.role !== 'admin') {
    //   return res.status(403).json({ message: 'Access denied' });
    // }

    const users = await User.find().select('-password');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
  },
  async refresh(req, res, next) {
    // 1. get refreshToken from cookies
    // 2. verify refreshToken
    // 3. generate new tokens
    // 4. update db, return response

    const originalRefreshToken = req.cookies.refreshToken;

    let id;

    try {
      id = JWTService.verifyRefreshToken(originalRefreshToken)._id;
    } catch (e) {
      const error = {
        status: 401,
        message: "Unauthorized",
      };

      return next(error);
    }

    try {
      const match = RefreshToken.findOne({
        _id: id,
        token: originalRefreshToken,
      });

      if (!match) {
        const error = {
          status: 401,
          message: "Unauthorized",
        };

        return next(error);
      }
    } catch (e) {
      return next(e);
    }

    try {
      const accessToken = JWTService.signAccessToken({ _id: id }, "300000m");

      const refreshToken = JWTService.signRefreshToken({ _id: id }, "600000m");

      await RefreshToken.updateOne({ _id: id }, { token: refreshToken });

      res.cookie("accessToken", accessToken, {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
      });

      res.cookie("refreshToken", refreshToken, {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
      });
    } catch (e) {
      return next(e);
    }

    const user = await User.findOne({ _id: id });

    const userDto = new UserDTO(user);

    return res.status(200).json({ user: userDto, auth: true });
  },
  // Enhanced with proper error handling and status codes
  async updateUser(req, res, next) {
    try {
      console.log('updating')
      const userId = req.params.id;
      const { name, phone, email, profileImage, location, rollNumber, semester, department, degree } = req.body;
      
      // Validate required fields
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Build update object
      const updateData = {};
      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;
      if (email) updateData.email = email;
      if (profileImage) updateData.profileImage = profileImage;
      if (rollNumber) updateData.rollNumber = rollNumber;
      if (semester) updateData.semester = semester;
      if (department) updateData.department = department;
      if (degree) updateData.degree = degree;
      
      // Handle location update
      if (location) {
        if (!location.coordinates || location.coordinates.length !== 2) {
          return res.status(400).json({ error: 'Invalid location format' });
        }
        
        updateData.location = {
          type: 'Point',
          coordinates: [
            parseFloat(location.coordinates[0]), // longitude
            parseFloat(location.coordinates[1])  // latitude
          ]
        };
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        message: 'User updated successfully',
        user: updatedUser
      });
      
    } catch (error) {
      console.error('Update error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Server error',
        details: error.message 
      });
    }
  },
  async updateProfileImage(req, res, next) {
    console.log('Updating profile image');
    const { id } = req.params;
    console.log(id);

    const schema = Joi.object({
      // No need to validate base64 now, but you can validate req.file if needed
    });

    const { error } = schema.validate({});
    if (error) {
      return next(error);
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      const streamUpload = (req) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'profile_images' },
            (error, result) => {
              if (result) {
                resolve(result);
              } else {
                reject(error);
              }
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
      };

      const uploadResult = await streamUpload(req);
      const photoUrl = uploadResult.secure_url;

      await User.updateOne({ _id: id }, { profileImage: photoUrl });

      const user = await User.findOne({ _id: id });
      const userDto = new UserDTO(user);

      return res.status(200).json({ user: userDto, auth: true });
    } catch (error) {
      return next(error);
    }
  },
  async getProfileImage(req, res, next) {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json({ profileImage: user.profileImage });
    } catch (error) {
      return next(error);
    }
  },
  // Forgot password controller
  async forgotPassword(req, res) {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    try {
      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found with this email' });
      }

      // Generate OTP
      const otp = generateOTP();
      
      // Store OTP with expiry time (10 minutes)
      otpStore.set(email, {
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });

      // Send OTP via email
      const emailSent = await sendOTPEmail(email, otp);
      
      if (!emailSent) {
        return res.status(500).json({ message: 'Failed to send OTP email' });
      }

      return res.status(200).json({ message: 'OTP sent to your email' });
    } catch (error) {
      console.error('Forgot password error:', error);
      return res.status(500).json({ message: 'Server error. Please try again later.' });
    }
  },
  // Verify OTP controller
  verifyOTP(req, res) {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Get stored OTP details
    const storedOTPData = otpStore.get(email);
    
    if (!storedOTPData) {
      return res.status(400).json({ message: 'OTP not requested or expired' });
    }

    // Check if OTP is expired
    if (new Date() > storedOTPData.expiresAt) {
      otpStore.delete(email); // Clean up expired OTP
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }

    // Verify OTP
    if (storedOTPData.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    return res.status(200).json({ message: 'OTP verified successfully' });
  },
  // Reset password controller
  async resetPassword(req, res) {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    // Validate password
    if (!passwordPattern.test(newPassword)) {
      return res.status(400).json({ 
        message: 'Password must be 8-25 characters and include at least one uppercase letter, one lowercase letter, and one number'
      });
    }

    // Get stored OTP details
    const storedOTPData = otpStore.get(email);
    
    if (!storedOTPData) {
      return res.status(400).json({ message: 'OTP not requested or expired' });
    }

    // Check if OTP is expired
    if (new Date() > storedOTPData.expiresAt) {
      otpStore.delete(email); // Clean up expired OTP
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }

    // Verify OTP
    if (storedOTPData.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    try {
      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      user.password = hashedPassword;
      await user.save();
      
      // Clean up used OTP
      otpStore.delete(email);

      return res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      return res.status(500).json({ message: 'Server error. Please try again later.' });
    }
  },
  // Verify reset token
  verifyResetToken(req, res) {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }
    
    // Get stored token details
    const tokenData = resetTokenStore.get(token);
    
    if (!tokenData) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    // Check if token is expired
    if (new Date() > tokenData.expiresAt) {
      resetTokenStore.delete(token);
      return res.status(400).json({ message: 'Token expired. Please request a new one.' });
    }
    
    return res.status(200).json({ 
      message: 'Token is valid',
      email: tokenData.email
    });
  },
  // Reset password with token
  async resetPasswordWithToken(req, res) {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }
    
    // Get stored token details
    const tokenData = resetTokenStore.get(token);
    
    if (!tokenData) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    // Check if token is expired
    if (new Date() > tokenData.expiresAt) {
      resetTokenStore.delete(token);
      return res.status(400).json({ message: 'Token expired. Please request a new one.' });
    }
    
    // Validate password
    if (!passwordPattern.test(newPassword)) {
      return res.status(400).json({ 
        message: 'Password must be 8-25 characters and include at least one uppercase letter, one lowercase letter, and one number'
      });
    }
    
    try {
      // Find user
      const user = await User.findOne({ email: tokenData.email });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password
      user.password = hashedPassword;
      await user.save();
      
      // Clean up used token
      resetTokenStore.delete(token);
      
      return res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      return res.status(500).json({ message: 'Server error. Please try again later.' });
    }
  }
};

module.exports = authController;
