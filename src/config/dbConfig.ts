export interface DbConfig {
    HOST: string;
    PORT: number;
    USER: string;
    PASSWORD: string;
    DB: string;
    dialect: 'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mssql';
    pool: {
        max: number;
        min: number;
        acquire: number;
        idle: number;
    };
}

// Handle empty password for XAMPP default
const getPassword = (): string => {
    if (process.env.DB_PASSWORD !== undefined) {
        return process.env.DB_PASSWORD;
    }
    return 'test123'; // Default for non-XAMPP setups
};

const dbConfig: DbConfig = {
    HOST: process.env.DB_HOST || 'mysql',
    PORT: parseInt(process.env.DB_PORT || '3306', 10),
    USER: process.env.DB_USER || 'root',
    PASSWORD: getPassword(),
    DB: process.env.DB_NAME || 'notes_db',
    dialect: 'mysql',
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
};

export default dbConfig;

