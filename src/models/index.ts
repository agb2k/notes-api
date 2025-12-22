import dbConfig from '../config/dbConfig';
import { Sequelize } from 'sequelize';
import userModel from './userModel';
import noteModel from './noteModel';
import noteVersionModel from './noteVersionModel';
import noteShareModel from './noteShareModel';
import noteAttachmentModel from './noteAttachmentModel';
import { DatabaseModels, ModelWithAssociate } from '../types/database';
import logger from '../utils/logger';

const sequelize = new Sequelize(
    dbConfig.DB,
    dbConfig.USER,
    dbConfig.PASSWORD,
    {
        host: dbConfig.HOST,
        dialect: 'mysql',
        pool: {
            max: dbConfig.pool.max,
            min: dbConfig.pool.min,
            acquire: dbConfig.pool.acquire,
            idle: dbConfig.pool.idle
        }
    }
);

sequelize.authenticate()
    .then(() => {
        logger.info('Database connected successfully');
    })
    .catch((err: Error) => {
        logger.error('Database connection error:', err);
        if (process.env.NODE_ENV === 'production') {
            logger.error('Database connection failed in production');
        }
    });

const db = {} as DatabaseModels;

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.notes = noteModel(sequelize) as DatabaseModels['notes'];
db.users = userModel(sequelize) as DatabaseModels['users'];
db.noteVersions = noteVersionModel(sequelize) as DatabaseModels['noteVersions'];
db.noteShares = noteShareModel(sequelize) as DatabaseModels['noteShares'];
db.noteAttachments = noteAttachmentModel(sequelize) as DatabaseModels['noteAttachments'];

// Run associations
Object.keys(db).forEach((modelName) => {
    const model = db[modelName as keyof DatabaseModels] as unknown as ModelWithAssociate;
    if (model && typeof model.associate === 'function') {
        model.associate(db);
    }
});

export default db;

