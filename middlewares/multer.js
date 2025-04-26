const multer = require('multer');

// Use memory storage for temporary file buffer in RAM
const storage = multer.memoryStorage();

const upload = multer({ storage });

module.exports = upload;
