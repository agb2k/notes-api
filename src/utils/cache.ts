import redis from '../config/redisConfig';
import { CACHE_TTL } from '../constants';
import logger from './logger';
import db from '../models';

const getAllUsersWithNoteAccess = async (noteId: string): Promise<string[]> => {
    try {
        const Note = db.notes;
        const NoteShare = db.noteShares;

        const [note, shares] = await Promise.all([
            Note.findByPk(noteId, { attributes: ['userId'] }),
            NoteShare.findAll({
                where: { noteId },
                attributes: ['sharedWithUserId']
            })
        ]);

        const userIds = new Set<string>();

        if (note && note.userId) {
            userIds.add(note.userId);
        }

        shares.forEach(share => {
            if (share.sharedWithUserId) {
                userIds.add(share.sharedWithUserId);
            }
        });

        return Array.from(userIds);
    } catch (error) {
        logger.warn('Failed to get users with note access', { noteId, error });
        return [];
    }
};

export const invalidateNoteCache = async (noteId: string, userId?: string, explicitUserIds?: string[]): Promise<void> => {
    try {
        let userIds: string[];
        if (explicitUserIds && explicitUserIds.length > 0) {
            userIds = explicitUserIds;
        } else {
            userIds = await getAllUsersWithNoteAccess(noteId);
        }

        const pipeline = redis.pipeline();

        pipeline.del(`note:${noteId}`);

        const invalidationPromises: Promise<void>[] = [];
        for (const uid of userIds) {
            pipeline.del(`notes:${uid}`);
            invalidationPromises.push(invalidateSearchCache(uid));
        }

        await pipeline.exec();

        await Promise.all(invalidationPromises);

        if (userIds.length > 0) {
            logger.debug(`Invalidated cache for note and ${userIds.length} user(s)`, { noteId, userIds });
        }
    } catch (error) {
        logger.warn('Failed to invalidate cache', { noteId, userId, error });
    }
};

export const getCachedData = async <T>(key: string): Promise<T | null> => {
    try {
        const cached = await redis.get(key);
        if (!cached) {
            return null;
        }
        try {
            return JSON.parse(cached) as T;
        } catch (parseError) {
            logger.warn('Failed to parse cached data', { key, error: parseError });
            return null;
        }
    } catch (error) {
        logger.warn('Cache read failed, treating as cache miss', { key, error });
        return null;
    }
};

export const setCachedData = async (key: string, data: unknown, ttl: number = CACHE_TTL.NOTE): Promise<void> => {
    try {
        await redis.set(key, JSON.stringify(data), 'EX', ttl);
    } catch (error) {
        logger.warn('Failed to set cache', { key, error });
    }
};

export const invalidateSearchCache = async (userId: string): Promise<void> => {
    try {
        const pattern = `notes:search:${userId}:*`;
        const stream = redis.scanStream({
            match: pattern,
            count: 100,
        });

        const pipeline = redis.pipeline();
        let keyCount = 0;

        stream.on('data', (keys: string[]) => {
            keys.forEach((key) => {
                pipeline.del(key);
                keyCount++;
            });
        });

        await new Promise<void>((resolve, reject) => {
            stream.on('end', async () => {
                if (keyCount > 0) {
                    await pipeline.exec();
                }
                resolve();
            });
            stream.on('error', reject);
        });

        if (keyCount > 0) {
            logger.debug(`Invalidated ${keyCount} search cache entries for user`, { userId });
        }
    } catch (error) {
        logger.warn('Failed to invalidate search cache', { userId, error });
    }
};

export const storeRefreshToken = async (
    userId: string,
    tokenId: string,
    refreshToken: string,
    expiresIn: number
): Promise<void> => {
    try {
        const key = `refreshToken:${userId}:${tokenId}`;
        await redis.set(key, JSON.stringify({ userId, token: refreshToken }), 'EX', expiresIn);
    } catch (error) {
        logger.warn('Failed to store refresh token', { userId, tokenId, error });
    }
};

export const getRefreshToken = async (
    userId: string,
    tokenId: string
): Promise<{ userId: string; token: string } | null> => {
    try {
        const key = `refreshToken:${userId}:${tokenId}`;
        const cached = await redis.get(key);
        if (!cached) {
            return null;
        }
        try {
            const data = JSON.parse(cached) as { userId: string; token: string };
            if (data.userId !== userId) {
                logger.warn('Refresh token userId mismatch', { userId, tokenId });
                return null;
            }
            return data;
        } catch (parseError) {
            logger.warn('Failed to parse refresh token data', { key, error: parseError });
            return null;
        }
    } catch (error) {
        logger.warn('Failed to get refresh token', { userId, tokenId, error });
        return null;
    }
};

export const revokeRefreshToken = async (userId: string, tokenId: string): Promise<void> => {
    try {
        const key = `refreshToken:${userId}:${tokenId}`;
        await redis.del(key);
    } catch (error) {
        logger.warn('Failed to revoke refresh token', { userId, tokenId, error });
    }
};

export const revokeAllUserRefreshTokens = async (userId: string): Promise<void> => {
    try {
        const pattern = `refreshToken:${userId}:*`;
        const stream = redis.scanStream({
            match: pattern,
            count: 100,
        });

        const pipeline = redis.pipeline();
        let tokenCount = 0;

        stream.on('data', (keys: string[]) => {
            keys.forEach((key) => {
                pipeline.del(key);
                tokenCount++;
            });
        });

        await new Promise<void>((resolve, reject) => {
            stream.on('end', async () => {
                if (tokenCount > 0) {
                    await pipeline.exec();
                }
                resolve();
            });
            stream.on('error', reject);
        });

        if (tokenCount > 0) {
            logger.info(`Revoked ${tokenCount} refresh tokens for user`, { userId });
        }
    } catch (error) {
        logger.warn('Failed to revoke all refresh tokens', { userId, error });
    }
};

