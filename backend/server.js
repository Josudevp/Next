import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import sequelize from './config/db.js';

// 👇 ¡AQUÍ ESTÁ LA MAGIA! Importamos el modelo para que Sequelize lo registre
import './models/User.js'; 

const app = express();

app.use(cors());
app.use(express.json());

// Ahora cuando sincronice, ya sabrá que existe un modelo User
sequelize.sync({ alter: true })
  .then(() => console.log('✅ Tablas de NEXT sincronizadas en MySQL'))
  .catch(err => console.log('❌ Error al sincronizar:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor de NEXT corriendo en http://localhost:${PORT}`);
});