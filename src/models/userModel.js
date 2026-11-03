
const { pool } = require('../config/database');

// Get all users
const getAllUsers = async () => {
    const [rows] = await pool.query(
        `SELECT id, name, email, role, status,
                created_at, updated_at
         FROM users
         ORDER BY id DESC`
    );

    return rows;
};

// Get single user
const getUserById = async (id) => {
    const [rows] = await pool.execute(
        `SELECT id, name, email, role, status,
                created_at, updated_at
         FROM users
         WHERE id = ?`,
        [id]
    );

    return rows[0];
};

// Create user
const createUser = async (user) => {
    const [result] = await pool.execute(
        `INSERT INTO users (name, email, password)
         VALUES (?, ?, ?)`,
        [user.name, user.email, user.password]
    );

    return result.insertId;
};

// Update user
const checkEmailExists = async (email, userId) => {
    const [rows] = await pool.execute(
        `SELECT id
         FROM users
         WHERE email = ?
         AND id != ?`,
        [email, userId]
    );

    return rows.length > 0;
};

// Partial update user
const updateUser = async (id, user) => {

    const fields = [];
    const values = [];

    // Dynamically build update fields
    if (user.name !== undefined) {
        fields.push('name = ?');
        values.push(user.name);
    }

    if (user.email !== undefined) {
        fields.push('email = ?');
        values.push(user.email);
    }

    if (fields.length === 0) {
        return 0;
    }

    values.push(id);

    const sql = `
        UPDATE users
        SET ${fields.join(', ')}
        WHERE id = ?
    `;

    const [result] = await pool.execute(sql, values);

    return result.affectedRows;
};

// Delete user
const deleteUser = async (id) => {
    const [result] = await pool.execute(
        `DELETE FROM users WHERE id = ?`,
        [id]
    );

    return result.affectedRows;
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
	checkEmailExists
};
