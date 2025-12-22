import { DataTypes, Model, Sequelize } from 'sequelize';
import { CategoryType } from './noteModel';
import { AssociateFunction } from '../types/database';
import { NoteCategory } from '../constants/enums';

export interface NoteVersionAttributes {
    id?: string;
    noteId: string;
    content: string;
    category?: CategoryType;
    versionNumber: number;
    createdBy: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface NoteVersionInstance extends Model<NoteVersionAttributes>, NoteVersionAttributes {
    associate?: AssociateFunction;
}

export default (sequelize: Sequelize) => {
    const NoteVersion = sequelize.define<NoteVersionInstance>('noteVersion', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false,
        },
        noteId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'notes',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        category: {
            type: DataTypes.ENUM(NoteCategory.WORK, NoteCategory.PERSONAL, NoteCategory.EDUCATION),
            allowNull: true,
        },
        versionNumber: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        createdBy: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
    }, {
        indexes: [
            {
                fields: ['noteId', 'versionNumber'],
                unique: true,
            }
        ]
    });

    (NoteVersion as unknown as { associate: AssociateFunction }).associate = (models) => {
        NoteVersion.belongsTo(models.notes, { foreignKey: 'noteId', as: 'note' });
        NoteVersion.belongsTo(models.users, { foreignKey: 'createdBy', as: 'creator' });
    };

    return NoteVersion;
};

