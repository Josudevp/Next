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
        // false: permite el certificado autofirmado de Aiven en Render.
        // Si en el futuro descargas el CA cert de Aiven y lo incluyes
        // en el repo, cambia esto a true y adjunta el cert.
        rejectUnauthorized: false,
      },
    },
    pool: {
      max: 5,       // Máximo conexiones simultáneas (Free Tier de Aiven es limitado)
      min: 0,
      acquire: 30000,
      idle: 10000,
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