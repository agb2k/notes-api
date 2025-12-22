import jwt from 'jsonwebtoken';
import { UnauthorizedError, ValidationError } from '../utils/errors';
import logger from '../utils/logger';
import { JWT_CONFIG } from '../constants';
import { getRefreshToken, revokeRefreshToken } from '../utils/cache';
import { getJwtSecret } from '../utils/envValidator';

export class AuthService {
    static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
        if (!refreshToken) {
            throw new ValidationError('Refresh token is required');
        }

        try {
            const jwtSecret = getJwtSecret();

            const decoded = jwt.verify(refreshToken, jwtSecret) as { userId: string; tokenId: string };
            
            if (!decoded.userId || !decoded.tokenId) {
                throw new UnauthorizedError('Invalid refresh token');
            }

            const storedToken = await getRefreshToken(decoded.userId, decoded.tokenId);
            if (!storedToken || storedToken.token !== refreshToken) {
                throw new UnauthorizedError('Refresh token not found or revoked');
            }

            const accessToken = jwt.sign(
                { userId: decoded.userId },
                jwtSecret,
                { expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRES_IN }
            );

            return { accessToken };
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
                throw new UnauthorizedError('Invalid or expired refresh token');
            }
            logger.error('Error refreshing token:', error);
            throw error;
        }
    }

    static async logout(refreshToken: string): Promise<void> {
        if (!refreshToken) {
            throw new ValidationError('Refresh token is required');
        }

        try {
            const jwtSecret = getJwtSecret();

            try {
                const decoded = jwt.verify(refreshToken, jwtSecret) as { userId: string; tokenId: string };
                
                if (decoded.userId && decoded.tokenId) {
                    await revokeRefreshToken(decoded.userId, decoded.tokenId);
                }
            } catch (jwtError) {
            }
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
                return;
            }
            logger.error('Error during logout:', error);
            throw error;
        }
    }
}

