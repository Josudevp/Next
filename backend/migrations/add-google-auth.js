/**
 * Migration: add-google-auth
 * Adds googleId column and makes password nullable for Google OAuth users.
 *
 * Run once: node backend/migrations/add-google-auth.js
 */
import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { QueryTypes } from 'sequelize';

const run = async () => {
    try {
        await sequelize.authenticate();
        console.log('[migration] Conexión a la DB exitosa.');

        // 1. Add googleId column (skip if already exists)
        const [cols] = await sequelize.query(
            `SHOW COLUMNS FROM Users LIKE 'googleId'`,
            { type: QueryTypes.SELECT }
        );
        if (!cols) {
            await sequelize.query(`
                ALTER TABLE Users 
                ADD COLUMN googleId VARCHAR(255) NULL
            `);
            console.log('[migration] Columna googleId agregada.');
        } else {
            console.log('[migration] Columna googleId ya existe, saltando.');
        }

        // 2. Make password nullable
        await sequelize.query(`
            ALTER TABLE Users 
            MODIFY COLUMN password VARCHAR(255) NULL
        `);
        console.log('[migration] Columna password ahora acepta NULL (para usuarios de Google).');

        console.log('[migration] ✅ Migración completada.');
        process.exit(0);
    } catch (err) {
        console.error('[migration] ❌ Error:', err.message);
        process.exit(1);
    }
};

run();
