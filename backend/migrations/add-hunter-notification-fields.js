/**
 * Migración: Agregar campos de retención para Hunter Notifications
 * Ejecutar una sola vez con: node migrations/add-hunter-notification-fields.js
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';

const runMigration = async () => {
  try {
    console.log('🔄 Iniciando migración: hunter notifications...');

    const [cols] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users'
    `);
    const existing = cols.map((column) => column.COLUMN_NAME);

    if (!existing.includes('hunterNotificationsEnabled')) {
      await sequelize.query(`
        ALTER TABLE Users
        ADD COLUMN hunterNotificationsEnabled TINYINT(1) NOT NULL DEFAULT 1 AFTER resetPasswordExpires
      `);
      console.log('✅ Columna hunterNotificationsEnabled agregada');
    } else {
      console.log('⚠️  hunterNotificationsEnabled ya existe — omitida');
    }

    if (!existing.includes('hunterLastNotifiedAt')) {
      await sequelize.query(`
        ALTER TABLE Users
        ADD COLUMN hunterLastNotifiedAt DATETIME NULL AFTER hunterNotificationsEnabled
      `);
      console.log('✅ Columna hunterLastNotifiedAt agregada');
    } else {
      console.log('⚠️  hunterLastNotifiedAt ya existe — omitida');
    }

    if (!existing.includes('hunterSeenJobIds')) {
      await sequelize.query(`
        ALTER TABLE Users
        ADD COLUMN hunterSeenJobIds JSON NULL AFTER hunterLastNotifiedAt
      `);
      console.log('✅ Columna hunterSeenJobIds agregada');
    } else {
      console.log('⚠️  hunterSeenJobIds ya existe — omitida');
    }

    console.log('✅ Migración completada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error.message);
    process.exit(1);
  }
};

runMigration();