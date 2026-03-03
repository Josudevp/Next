import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';

const Message = sequelize.define(
    'Message',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: User,
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        sender: {
            type: DataTypes.ENUM('user', 'ai'),
            allowNull: false,
        },
        text: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
    },
    {
        tableName: 'Messages',
        updatedAt: false, // Solo necesitamos createdAt
    }
);

// ── Asociaciones ──────────────────────────────────────────────────────────────
// Un usuario tiene muchos mensajes; cada mensaje pertenece a un usuario.
User.hasMany(Message, { foreignKey: 'userId', as: 'messages', onDelete: 'CASCADE' });
Message.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export default Message;
