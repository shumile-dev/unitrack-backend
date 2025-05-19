const mongoose = require('mongoose');
const { Schema } = mongoose;

const claimSchema = new Schema({
  itemId: { 
    type: mongoose.SchemaTypes.ObjectId, 
    ref: 'Blog', 
    required: true 
  },
  claimantName: { 
    type: String, 
    required: true 
  },
  claimantPhone: { 
    type: String, 
    required: true 
  },
  claimHints: { 
    type: String, 
    required: true 
  },
  claimant: { 
    type: mongoose.SchemaTypes.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Claim', claimSchema); 