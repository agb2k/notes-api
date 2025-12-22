// Test setup file
// This runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.DB_NAME = 'notes_db_test';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test123';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

