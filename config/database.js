require('dotenv').config();

// Handle empty password for XAMPP default
const getPassword = () => {
  if (process.env.DB_PASSWORD !== undefined) {
    return process.env.DB_PASSWORD; // Can be empty string for XAMPP
  }
  return 'test123'; // Default for non-XAMPP setups
};

// Helper to get database config
const getDbConfig = () => {
  return {
    username: process.env.DB_USER || 'root',
    password: getPassword(),
    database: process.env.DB_NAME || 'notes_db',
    host: process.env.DB_HOST || 'mysql',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
  };
};

// Determine environment - default to production if NODE_ENV is not set
const env = process.env.NODE_ENV || 'production';

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: getPassword(),
    database: process.env.DB_NAME || 'notes_db',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
  },
  production: getDbConfig(),
  // Also support test environment
  test: {
    username: process.env.DB_USER || 'root',
    password: getPassword(),
    database: process.env.DB_NAME || 'notes_db_test',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
  },
};

