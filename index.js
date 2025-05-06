const express = require("express");
const dbConnect = require("./database/index");
const router = require("./routes/index");
const errorHandler = require("./middlewares/errorHandler");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const PORT = 5000;

const corsOptions = {
  credentials: true,
  origin: ["*", "http://localhost:3000"], /// This should match the React Native development server URL
};

const app = express();

app.use(cookieParser());
app.use(cors(corsOptions));

app.use(express.json({ limit: "50mb" }));

app.use(router);

dbConnect();

app.use("/storage", express.static("storage"));
app.use("/storage", express.static("D:\\unitrack-backend\\storage"));

app.use(errorHandler);

app.listen(PORT, () => console.log(`Backend is running on port: ${PORT}`));
