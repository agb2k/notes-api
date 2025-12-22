/**
 * Script to set up the test database
 * Creates the database if it doesn't exist and runs migrations
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const { execSync } = require('child_process');

// Load test environment variables (same as tests/setup.ts)
process.env.NODE_ENV = 'test';
// Override DB_NAME for test environment (ignore .env file if it has a different value)
process.env.DB_NAME = 'notes_db_test';

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'test123',
    database: 'notes_db_test', // Always use test database name
};

async function setupTestDatabase() {
    console.log('Setting up test database...');
    console.log(`Host: ${dbConfig.host}`);
    console.log(`Port: ${dbConfig.port}`);
    console.log(`User: ${dbConfig.user}`);
    console.log(`Database: ${dbConfig.database}`);

    let connection;
    try {
        // Connect without specifying database (to create it)
        connection = await mysql.createConnection({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
        });

        console.log('Connected to MySQL server');

        // Create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
        console.log(`Database '${dbConfig.database}' is ready`);

        await connection.end();

        // Run migrations for test environment
        console.log('Running migrations for test environment...');
        try {
            execSync('npx sequelize-cli db:migrate --env test', {
                stdio: 'inherit',
                env: {
                    ...process.env,
                    NODE_ENV: 'test',
                    DB_NAME: dbConfig.database,
                    DB_HOST: dbConfig.host,
                    DB_PORT: dbConfig.port.toString(),
                    DB_USER: dbConfig.user,
                    DB_PASSWORD: dbConfig.password,
                },
            });
            console.log('Migrations completed successfully');
        } catch (error) {
            console.error('Migration failed:', error.message);
            process.exit(1);
        }

        console.log('Test database setup complete!');
    } catch (error) {
        console.error('Failed to set up test database:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('\nError: Could not connect to MySQL server.');
            console.error('Please ensure MySQL is running and accessible.');
            console.error(`Attempted connection to: ${dbConfig.host}:${dbConfig.port}`);
        } else if (error.code === 'ER_ACCESS_DENIED') {
            console.error('\nError: Access denied. Please check your database credentials.');
            console.error('You can set credentials via environment variables:');
            console.error('  DB_USER, DB_PASSWORD, DB_HOST, DB_PORT');
        }
        process.exit(1);
    }
}

setupTestDatabase();

