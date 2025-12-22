import { DataTypes, Model, Sequelize } from 'sequelize';
import { AssociateFunction } from '../types/database';
import { SharePermission } from '../constants/enums';

export interface NoteShareAttributes {
    id?: string;
    noteId: string;
    sharedWithUserId: string;
    permission: SharePermission;
    sharedByUserId: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface NoteShareInstance extends Model<NoteShareAttributes>, NoteShareAttributes {
    associate?: AssociateFunction;
}

export default (sequelize: Sequelize) => {
    const NoteShare = sequelize.define<NoteShareInstance>('noteShare', {
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
        sharedWithUserId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        permission: {
            type: DataTypes.ENUM(SharePermission.READ, SharePermission.EDIT),
            allowNull: false,
            defaultValue: SharePermission.READ,
        },
        sharedByUserId: {
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
                unique: true,
                fields: ['noteId', 'sharedWithUserId'],
                name: 'noteShares_noteId_sharedWithUserId_unique'
            },
            {
                fields: ['sharedWithUserId']
            },
            {
                fields: ['noteId']
            }
        ]
    });

    (NoteShare as unknown as { associate: AssociateFunction }).associate = (models) => {
        NoteShare.belongsTo(models.notes, { foreignKey: 'noteId', as: 'note' });
        NoteShare.belongsTo(models.users, { foreignKey: 'sharedWithUserId', as: 'sharedWithUser' });
        NoteShare.belongsTo(models.users, { foreignKey: 'sharedByUserId', as: 'sharedByUser' });
    };

    return NoteShare;
};

