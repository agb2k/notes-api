import db from '../models';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { ValidationError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import { JWT_CONFIG } from '../constants';
import { storeRefreshToken } from '../utils/cache';
import { RegisterDTO, LoginDTO, TokenResponse } from '../dto/user.dto';
import { getJwtSecret } from '../utils/envValidator';

const User = db.users;

/**
 * Service for user-related business logic
 */
export class UserService {
    /**
     * Registers a new user account
     * Password is hashed using bcrypt before storage
     * @param data - Registration data (username and password)
     * @returns Promise that resolves with the created user ID
     * @throws {ValidationError} If validation fails (username/password constraints)
     */
    static async registerUser(data: RegisterDTO): Promise<{ userId: string }> {
        try {
            const hashedPassword = await bcrypt.hash(data.password, 10);
            const user = await User.create({
                username: data.username,
                password: hashedPassword
            });

            return { userId: user.id! };
        } catch (error: unknown) {
            logger.error('Error creating user:', error);
            throw error;
        }
    }

    /**
     * Authenticates a user and returns both JWT access token and refresh token
     * @param data - Login data (username and password)
     * @returns Promise that resolves with authentication tokens
     * @throws {NotFoundError} If user not found
     * @throws {ValidationError} If password is incorrect
     */
    static async loginUser(data: LoginDTO): Promise<TokenResponse> {
        try {
            const user = await User.findOne({ where: { username: data.username } });
            if (!user) {
                throw new NotFoundError('User not found');
            }

            const isMatch = await bcrypt.compare(data.password, user.password);
            if (!isMatch) {
                throw new ValidationError('Invalid credentials');
            }

            const jwtSecret = getJwtSecret();

            const accessToken = jwt.sign(
                { userId: user.id },
                jwtSecret,
                { expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRES_IN }
            );

            const tokenId = randomUUID();
            const refreshToken = jwt.sign(
                { userId: user.id, tokenId },
                jwtSecret,
                { expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRES_IN }
            );

            await storeRefreshToken(user.id!, tokenId, refreshToken, JWT_CONFIG.REFRESH_TOKEN_EXPIRES_IN_SECONDS);

            return {
                accessToken,
                refreshToken
            };
        } catch (error: unknown) {
            logger.error('Error logging in:', error);
            throw error;
        }
    }
}

