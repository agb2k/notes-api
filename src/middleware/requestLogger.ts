import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        // Only log errors, slow requests (>1s), or if in debug mode
        const shouldLog = res.statusCode >= 400 || duration > 1000 || process.env.LOG_LEVEL === 'debug';
        if (shouldLog) {
            logger.info(`${req.method} ${req.path}`, {
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                ip: req.ip,
            });
        }
    });

    next();
};

