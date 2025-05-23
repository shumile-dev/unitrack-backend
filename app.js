const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const router = require('./routes/index');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const blogRoutes = require('./routes/blogRoutes');
const claimRoutes = require('./routes/claimRoutes');

dotenv.config({path: './config.env'});

const app = express();

// Connect to MongoDB
mongoose.connect(`${process.env.MONGO_URI} || mongodb://localhost:27017/unitrack`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true,
}));
app.use(cookieParser());

// Routes
app.use('/', router);  // Use the main router from index.js
app.use('/user', userRoutes);
app.use('/blog', blogRoutes);
app.use('/admin', adminRoutes);
app.use('/claim', claimRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
