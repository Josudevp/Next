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
  }
});

export default User;