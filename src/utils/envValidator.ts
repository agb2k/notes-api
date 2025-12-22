import logger from './logger';
import { randomBytes } from 'crypto';

export const getJwtSecret = (): string => {
    if (process.env.JWT_SECRET) {
        return process.env.JWT_SECRET;
    }
    
    const autoSecret = randomBytes(32).toString('base64');
    
    if (process.env.NODE_ENV === 'production') {
        logger.warn('WARNING: JWT_SECRET not set! Using auto-generated secret. Set JWT_SECRET for production!');
    } else {
        logger.info('JWT_SECRET not set, using auto-generated secret for development');
    }
    
    process.env.JWT_SECRET = autoSecret;
    return autoSecret;
};

export const validateEnvironment = (): void => {
    getJwtSecret();
};

