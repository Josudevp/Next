import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import sequelize from './config/db.js';
import './models/User.js';

// 👇 1. Importa tus rutas aquí arriba
import authRoutes from './routes/authRoutes.js';
import coachRoutes from './routes/coachRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

// 👇 2. Dile a Express que use esas rutas
app.use('/api/auth', authRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/user', userRoutes);

sequelize.sync({ alter: true })
  .then(() => console.log('✅ Tablas de NEXT sincronizadas en MySQL'))
  .catch(err => console.log('❌ Error al sincronizar:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor de NEXT corriendo en http://localhost:${PORT}`);
});