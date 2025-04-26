const mongoose = require('mongoose');
const {MONGODB_CONNECTION_STRING} = require('../config/index');

const dbConnect = async () => {
    try {
        mongoose.set('strictQuery', false);
        const conn = await mongoose.connect("mongodb+srv://tayyab:crazy302@cluster0.h9okxii.mongodb.net/");
        console.log(`Database connected to host: ${conn.connection.host}`);
        
    } catch (error) {
        console.log(`Error: ${error}`);
    }
}

module.exports = dbConnect;