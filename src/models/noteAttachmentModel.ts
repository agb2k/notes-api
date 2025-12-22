import { DataTypes, Model, Sequelize } from 'sequelize';
import { AssociateFunction } from '../types/database';

export interface NoteAttachmentAttributes {
    id?: string;
    noteId: string;
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    uploadedByUserId: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface NoteAttachmentInstance extends Model<NoteAttachmentAttributes>, NoteAttachmentAttributes {
    associate?: AssociateFunction;
}

export default (sequelize: Sequelize) => {
    const NoteAttachment = sequelize.define<NoteAttachmentInstance>('noteAttachment', {
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
        fileName: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        filePath: {
            type: DataTypes.STRING(500),
            allowNull: false,
        },
        fileType: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        fileSize: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        uploadedByUserId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
    }, {
        indexes: [
            {
                fields: ['noteId']
            }
        ]
    });

    (NoteAttachment as unknown as { associate: AssociateFunction }).associate = (models) => {
        NoteAttachment.belongsTo(models.notes, { foreignKey: 'noteId', as: 'note' });
        NoteAttachment.belongsTo(models.users, { foreignKey: 'uploadedByUserId', as: 'uploadedByUser' });
    };

    return NoteAttachment;
};

