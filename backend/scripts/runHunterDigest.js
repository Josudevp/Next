import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import '../models/User.js';
import { runHunterDigest } from '../services/hunterNotificationService.js';

const main = async () => {
  try {
    await sequelize.authenticate();
    console.log('[HunterDigest] Conexion con BD lista');
    await runHunterDigest();
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('[HunterDigest] Ejecucion fallida:', error);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
};

main();