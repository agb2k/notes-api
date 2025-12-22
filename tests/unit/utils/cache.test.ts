/**
 * Unit tests for cache utilities
 * 
 * Note: These tests mock Redis operations.
 * For full integration testing, use a test Redis instance.
 */

import redis from '../../../src/config/redisConfig';

// Mock Redis
jest.mock('../../../src/config/redisConfig', () => {
    const mockRedis = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        scanStream: jest.fn(),
        pipeline: jest.fn(),
        ping: jest.fn(),
    };

    return {
        __esModule: true,
        default: mockRedis,
    };
});

import { getCachedData, setCachedData, invalidateNoteCache, invalidateSearchCache } from '../../../src/utils/cache';

describe('cache utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getCachedData', () => {
        it('should return parsed JSON data when cache hit', async () => {
            const mockData = { notes: [{ id: '1', content: 'test' }] };
            (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

            const result = await getCachedData<typeof mockData>('test:key');

            expect(result).toEqual(mockData);
            expect(redis.get).toHaveBeenCalledWith('test:key');
        });

        it('should return null when cache miss', async () => {
            (redis.get as jest.Mock).mockResolvedValue(null);

            const result = await getCachedData('test:key');

            expect(result).toBeNull();
        });

        it('should return null when Redis error occurs', async () => {
            (redis.get as jest.Mock).mockRejectedValue(new Error('Redis error'));

            const result = await getCachedData('test:key');

            expect(result).toBeNull();
        });

        it('should return null when JSON parse fails', async () => {
            (redis.get as jest.Mock).mockResolvedValue('invalid json{');

            const result = await getCachedData('test:key');

            expect(result).toBeNull();
        });
    });

    describe('setCachedData', () => {
        it('should set cache with TTL', async () => {
            const data = { notes: [] };
            (redis.set as jest.Mock).mockResolvedValue('OK');

            await setCachedData('test:key', data, 3600);

            expect(redis.set).toHaveBeenCalledWith(
                'test:key',
                JSON.stringify(data),
                'EX',
                3600
            );
        });

        it('should handle Redis errors gracefully', async () => {
            const data = { notes: [] };
            (redis.set as jest.Mock).mockRejectedValue(new Error('Redis error'));

            // Should not throw
            await expect(setCachedData('test:key', data, 3600)).resolves.not.toThrow();
        });
    });

    describe('invalidateNoteCache', () => {
        beforeEach(() => {
            // Mock pipeline for invalidateNoteCache
            const mockPipeline = {
                del: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([[null, 1], [null, 1]])
            };
            (redis.pipeline as jest.Mock).mockReturnValue(mockPipeline);

            // Mock invalidateSearchCache (which uses scanStream)
            const mockStream: {
                on: jest.Mock;
            } = {
                on: jest.fn((event: string, callback: (data: string[]) => void) => {
                    if (event === 'data') {
                        setTimeout(() => callback([]), 0);
                    } else if (event === 'end') {
                        setTimeout(() => callback([]), 10);
                    }
                    return mockStream;
                })
            };
            (redis.scanStream as jest.Mock).mockReturnValue(mockStream);
        });

        it('should delete note and user notes cache when using explicit user IDs', async () => {
            const explicitUserIds = ['user1', 'user2'];
            const mockPipeline = {
                del: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([[null, 1], [null, 1], [null, 1]])
            };
            (redis.pipeline as jest.Mock).mockReturnValue(mockPipeline);

            await invalidateNoteCache('note-id', undefined, explicitUserIds);

            // Should delete note cache
            expect(mockPipeline.del).toHaveBeenCalledWith('note:note-id');
            // Should delete notes list cache for each user
            expect(mockPipeline.del).toHaveBeenCalledWith('notes:user1');
            expect(mockPipeline.del).toHaveBeenCalledWith('notes:user2');
            // Should execute pipeline
            expect(mockPipeline.exec).toHaveBeenCalled();
        });

        it('should delete note cache even when no explicit user IDs provided', async () => {
            const mockPipeline = {
                del: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([[null, 1]])
            };
            (redis.pipeline as jest.Mock).mockReturnValue(mockPipeline);

            // Call without explicit user IDs - will query database (may return empty array)
            // The function should still invalidate note cache even if no users found
            await invalidateNoteCache('note-id');

            // Should still delete note cache even if no users found
            expect(mockPipeline.del).toHaveBeenCalledWith('note:note-id');
            expect(mockPipeline.exec).toHaveBeenCalled();
        });

        it('should handle Redis errors gracefully', async () => {
            (redis.pipeline as jest.Mock).mockReturnValue({
                del: jest.fn().mockReturnThis(),
                exec: jest.fn().mockRejectedValue(new Error('Redis error'))
            });

            // Should not throw
            await expect(invalidateNoteCache('note-id', undefined, ['user1'])).resolves.not.toThrow();
        });
    });

    describe('invalidateSearchCache', () => {
        it('should scan and delete search cache keys', async () => {
            const mockStream: {
                on: jest.Mock;
            } = {
                on: jest.fn((event: string, callback: (data: string[]) => void) => {
                    if (event === 'data') {
                        // Simulate stream data
                        setTimeout(() => callback(['notes:search:user1:keyword1', 'notes:search:user1:keyword2']), 0);
                    } else if (event === 'end') {
                        setTimeout(() => callback([]), 10);
                    }
                    return mockStream;
                })
            };

            const mockPipeline = {
                del: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([[null, 1], [null, 1]])
            };

            (redis.scanStream as jest.Mock).mockReturnValue(mockStream);
            (redis.pipeline as jest.Mock).mockReturnValue(mockPipeline);

            await invalidateSearchCache('user1');

            expect(redis.scanStream).toHaveBeenCalledWith({
                match: 'notes:search:user1:*',
                count: 100
            });
        });

        it('should handle Redis errors gracefully', async () => {
            (redis.scanStream as jest.Mock).mockImplementation(() => {
                throw new Error('Redis error');
            });

            // Should not throw
            await expect(invalidateSearchCache('user1')).resolves.not.toThrow();
        });
    });
});

