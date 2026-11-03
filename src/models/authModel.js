
const { pool } = require('../config/database');

// Find user by email
const findUserByEmail = async (email) => {
    const [rows] = await pool.execute(
        `SELECT id, name, email, password, role, status
         FROM users
         WHERE email = ?`,
        [email]
    );

    return rows[0];
};

// Create refresh token session
const createRefreshSession = async (
    userId,
    tokenHash,
    expiresAt
) => {
    const [result] = await pool.execute(
        `INSERT INTO refresh_tokens
         (user_id, token_hash, expires_at)
         VALUES (?, ?, ?)`,
        [userId, tokenHash, expiresAt]
    );

    return result.insertId;
};

// Rotate refresh token atomically
const rotateRefreshSession = async (
    userId,
    oldHash,
    newHash,
    expiresAt
) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [rows] = await connection.execute(
            `SELECT id
             FROM refresh_tokens
             WHERE user_id = ?
             AND token_hash = ?
             AND expires_at > UTC_TIMESTAMP()
             FOR UPDATE`,
            [userId, oldHash]
        );

        if (rows.length === 0) {
            await connection.rollback();
            return false;
        }

        await connection.execute(
            `DELETE FROM refresh_tokens WHERE id = ?`,
            [rows[0].id]
        );

        await connection.execute(
            `INSERT INTO refresh_tokens
             (user_id, token_hash, expires_at)
             VALUES (?, ?, ?)`,
            [userId, newHash, expiresAt]
        );

        await connection.commit();

        return true;

    } catch (error) {
        await connection.rollback();
        throw error;

    } finally {
        connection.release();
    }
};

// Revoke refresh token
const revokeRefreshSession = async (userId, tokenHash) => {
    const [result] = await pool.execute(
        `DELETE FROM refresh_tokens
         WHERE user_id = ?
         AND token_hash = ?`,
        [userId, tokenHash]
    );

    return result.affectedRows;
};

module.exports = {
    findUserByEmail,
    createRefreshSession,
    rotateRefreshSession,
    revokeRefreshSession
};
