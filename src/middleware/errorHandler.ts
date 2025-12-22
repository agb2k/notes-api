import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

export const errorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    if (err instanceof AppError) {
        logger.warn(`${err.name}: ${err.message}`, {
            statusCode: err.statusCode,
            path: req.path,
            method: req.method,
        });

        res.status(err.statusCode).json({
            error: {
                message: err.message,
                code: err.name,
            },
        });
        return;
    }

    logger.error('Unexpected error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    const statusCode = 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

    res.status(statusCode).json({
        error: {
            message,
            code: 'InternalServerError',
        },
    });
};

