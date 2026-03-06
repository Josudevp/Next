import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js'; // <-- ¡Ojo aquí con el .js!

const User = sequelize.define('User', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  area: {
    type: DataTypes.STRING,
    allowNull: true
  },
  skills: {
    type: DataTypes.JSON,
    allowNull: true
  },
  goals: {
    type: DataTypes.JSON,
    allowNull: true
  },
  jobType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  experienceLevel: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Sin experiencia'
  },
  profilePicture: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cvText: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  }
});

export default User;