/**
 * Migración: Agregar profilePicture y cvText a Users
 * Ejecutar una sola vez con: node migrations/add-profile-cv-fields.js
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';

const runMigration = async () => {
  try {
    console.log('🔄 Iniciando migración: profilePicture + cvText...');

    const [cols] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users'
    `);
    const existing = cols.map(c => c.COLUMN_NAME);

    if (!existing.includes('profilePicture')) {
      await sequelize.query(`ALTER TABLE Users ADD COLUMN profilePicture LONGTEXT AFTER experienceLevel`);
      console.log('✅ Columna profilePicture agregada');
    } else {
      console.log('⚠️  profilePicture ya existe — omitida');
    }

    if (!existing.includes('cvText')) {
      await sequelize.query(`ALTER TABLE Users ADD COLUMN cvText LONGTEXT AFTER profilePicture`);
      console.log('✅ Columna cvText agregada');
    } else {
      console.log('⚠️  cvText ya existe — omitida');
    }

    console.log('✅ Migración completada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error.message);
    process.exit(1);
  }
};

runMigration();
