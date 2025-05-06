const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema({
  // username: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  profileImage: { type: String },
  role: { type: String, enum: ['admin', 'provider','buyer'] },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],  // [longitude, latitude]
      index: '2dsphere'  // Create geospatial index
    }
  },
  designation: { type: String }, // Optional field for designation
  
  // Fields from Signup form
  rollNumber: { type: String },
  semester: { type: String },
  department: { type: String },
  degree: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema, 'users');
