import { DataTypes, Model, Sequelize } from 'sequelize';

export interface UserAttributes {
    id?: string;
    username: string;
    password: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface UserInstance extends Model<UserAttributes>, UserAttributes {}

export default (sequelize: Sequelize) => {
    const User = sequelize.define<UserInstance>('user', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false,
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        }
    });

    return User;
};

