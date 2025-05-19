const express = require("express");
const dbConnect = require("./database/index");
const router = require("./routes/index");
const errorHandler = require("./middlewares/errorHandler");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const blogRoutes = require('./routes/blogRoutes');
const claimRoutes = require('./routes/claimRoutes');

const PORT = 5000;

const corsOptions = {
  credentials: true,
  origin: ["*", "http://localhost:3000", "http://localhost:5000"], // Allow both localhost domains
};

const app = express();

app.use(cookieParser());
app.use(cors(corsOptions));

app.use(express.json({ limit: "50mb" }));

// Main router
app.use(router);

// Additional routes
app.use('/auth', authRoutes);
app.use('/blog', blogRoutes);
app.use('/admin', adminRoutes);
app.use('/claim', claimRoutes);

dbConnect();

app.use("/storage", express.static("storage"));
app.use("/storage", express.static("D:\\unitrack-backend\\storage"));

app.use(errorHandler);

app.listen(PORT, () => console.log(`Backend is running on port: ${PORT}`));
