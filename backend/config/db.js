import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Configuración de Sequelize para Aiven MySQL.
 *
 * PRODUCCIÓN (Render + Aiven):
 *   - Usa DATABASE_URL (Service URI de Aiven).
 *   - SSL obligatorio: rejectUnauthorized: false porque Aiven usa
 *     certificados de CA propios que Node.js no reconoce por defecto.
 *
 * LOCAL (XAMPP sin SSL):
 *   - Usa las variables individuales DB_NAME, DB_USER, DB_PASS, DB_HOST.
 *   - Sin SSL para no romper el entorno de desarrollo.
 */

let sequelize;

if (process.env.DATABASE_URL) {
  // ── PRODUCCIÓN ─────────────────────────────────────────────────────────────
  // FIX: Aiven incluye 'ssl-mode=REQUIRED' en la URL, lo cual causa un warning
  // en Sequelize/mysql2. Lo eliminamos de la URL y lo gestionamos explícitamente
  // con dialectOptions.ssl.
  const dbUrl = process.env.DATABASE_URL.replace('?ssl-mode=REQUIRED', '');

  sequelize = new Sequelize(dbUrl, {
    dialect: 'mysql',
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false,
      },
      // Tiempo máximo para establecer la conexión TCP con Aiven.
      // El default de mysql2 es 10s — demasiado bajo para Aiven free tier.
      connectTimeout: 60000,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 60000,  // Tiempo máximo para obtener una conexión del pool (era 30s)
      idle: 10000,
      evict: 10000,    // Frecuencia con que se limpian conexiones muertas del pool
    },
    retry: {
      max: 3,          // Reintentar operaciones fallidas hasta 3 veces automáticamente
    },
    logging: false,
  });
} else {
  // ── LOCAL (XAMPP sin SSL) ───────────────────────────────────────────────────
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      dialect: 'mysql',
      logging: false,
    }
  );
}

export default sequelize;