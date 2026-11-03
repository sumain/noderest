
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Main route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Node.js REST API is running!'
    });
});

// User routes
const userRoutes = require('./routes/userRoutes');

app.use('/api/users', userRoutes);

// Start server after database connection
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await testConnection();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error('Unable to start server:', error.message);
        process.exit(1);
    }
};

startServer();
