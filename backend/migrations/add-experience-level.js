/**
 * Migración: Agregar columna experienceLevel a Users
 * 
 * Ejecutar una sola vez con: node migrations/add-experience-level.js
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';

const runMigration = async () => {
  try {
    console.log('🔄 Iniciando migración: agregar experienceLevel...');
    
    // Verificar si la columna ya existe
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'Users' 
        AND COLUMN_NAME = 'experienceLevel'
    `);

    if (results.length > 0) {
      console.log('⚠️  La columna experienceLevel ya existe. Migración omitida.');
      process.exit(0);
    }

    // Agregar la columna
    await sequelize.query(`
      ALTER TABLE Users 
      ADD COLUMN experienceLevel VARCHAR(255) DEFAULT 'Sin experiencia' AFTER jobType
    `);

    console.log('✅ Columna experienceLevel agregada exitosamente');
    console.log('✅ Migración completada');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error.message);
    process.exit(1);
  }
};

runMigration();
