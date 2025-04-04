import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure Sequelize connection
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DATABASE_PATH || './basic-memory.sqlite',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
        timestamps: true,
        underscored: true
    }
});

export { sequelize };
