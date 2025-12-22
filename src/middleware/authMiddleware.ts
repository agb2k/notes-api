import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors';
import { getJwtSecret } from '../utils/envValidator';

export interface AuthRequest extends Request {
    userId?: string;
}

interface JwtPayload {
    userId: string;
    iat?: number;
    exp?: number;
}

const authenticateUser = (req: AuthRequest, _res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers['authorization'];
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('No token provided');
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            throw new UnauthorizedError('No token provided');
        }

        const jwtSecret = getJwtSecret();
        
        const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
        
        if (!decoded.userId || typeof decoded.userId !== 'string') {
            throw new UnauthorizedError('Invalid token payload');
        }
        
        req.userId = decoded.userId;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            next(new UnauthorizedError('Invalid or expired token'));
            return;
        }
        next(error instanceof UnauthorizedError ? error : new UnauthorizedError('Authentication failed'));
    }
};

export default authenticateUser;

