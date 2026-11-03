const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();

        console.log('MySQL Database Connected Successfully!');

        connection.release();
    } catch (error) {
        console.error('MySQL Connection Failed:', error.message);
        throw error;
    }
};

module.exports = {
    pool,
    testConnection
};