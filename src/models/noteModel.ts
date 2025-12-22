import { DataTypes, Model, Sequelize } from 'sequelize';
import { AssociateFunction } from '../types/database';
import { NoteCategory } from '../constants/enums';

export type CategoryType = NoteCategory | null;

export interface NoteAttributes {
    id?: string;
    content: string;
    userId: string;
    category?: CategoryType;
    version?: number;
    deletedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface NoteInstance extends Model<NoteAttributes>, NoteAttributes {
    associate?: AssociateFunction;
    version?: number; // For optimistic locking
}

export default (sequelize: Sequelize) => {
    const Note = sequelize.define<NoteInstance>('note', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false,
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        category: {
            type: DataTypes.ENUM(NoteCategory.WORK, NoteCategory.PERSONAL, NoteCategory.EDUCATION),
            allowNull: true,
            validate: {
                isIn: {
                    args: [[NoteCategory.WORK, NoteCategory.PERSONAL, NoteCategory.EDUCATION]],
                    msg: 'Category must be Work, Personal, or Education',
                },
            },
        },
        version: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            allowNull: false,
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    }, {
        paranoid: true,
        deletedAt: 'deletedAt',
    });

    // Type assertion needed due to Sequelize's dynamic model definition
    (Note as unknown as { associate: AssociateFunction }).associate = (models) => {
        Note.belongsTo(models.users, { foreignKey: 'userId', as: 'user' });
        Note.hasMany(models.noteVersions, { foreignKey: 'noteId', as: 'versions' });
        Note.hasMany(models.noteShares, { foreignKey: 'noteId', as: 'shares' });
        Note.hasMany(models.noteAttachments, { foreignKey: 'noteId', as: 'attachments' });
    };

    return Note;
};

