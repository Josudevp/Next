/**
 * Migración: Agregar resetPasswordToken y resetPasswordExpires a Users
 * Ejecutar una sola vez con: node migrations/add-reset-password-fields.js
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';

const runMigration = async () => {
  try {
    console.log('🔄 Iniciando migración: resetPasswordToken + resetPasswordExpires...');

    const [cols] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users'
    `);
    const existing = cols.map((column) => column.COLUMN_NAME);

    if (!existing.includes('resetPasswordToken')) {
      await sequelize.query(`
        ALTER TABLE Users
        ADD COLUMN resetPasswordToken VARCHAR(255) NULL AFTER cvText
      `);
      console.log('✅ Columna resetPasswordToken agregada');
    } else {
      console.log('⚠️  resetPasswordToken ya existe — omitida');
    }

    if (!existing.includes('resetPasswordExpires')) {
      await sequelize.query(`
        ALTER TABLE Users
        ADD COLUMN resetPasswordExpires DATETIME NULL AFTER resetPasswordToken
      `);
      console.log('✅ Columna resetPasswordExpires agregada');
    } else {
      console.log('⚠️  resetPasswordExpires ya existe — omitida');
    }

    console.log('✅ Migración completada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error.message);
    process.exit(1);
  }
};

runMigration();