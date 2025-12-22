import { Request } from 'express';
import { UnauthorizedError } from '../utils/errors';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/envValidator';

interface JwtPayload {
    userId: string;
    iat?: number;
    exp?: number;
}

/**
 * Authentication middleware for tsoa
 * This function is called by tsoa when @Security('bearerAuth') is used
 */
export async function expressAuthentication(
    request: Request,
    securityName: string,
    _scopes?: string[]
): Promise<any> {
    if (securityName === 'bearerAuth') {
        try {
            const authHeader = request.headers['authorization'];
            
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

            (request as any).userId = decoded.userId;
            
            return decoded.userId;
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
                throw new UnauthorizedError('Invalid or expired token');
            }
            throw error instanceof UnauthorizedError ? error : new UnauthorizedError('Authentication failed');
        }
    }
    
    throw new UnauthorizedError('Unknown security scheme');
}

