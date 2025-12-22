import Redis from 'ioredis';
import logger from '../utils/logger';

class RedisSingleton {
    private static instance: RedisSingleton;
    private redis: Redis;
    private connectionState: 'connecting' | 'connected' | 'ready' | 'error' | 'end' = 'connecting';

    private constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'redis',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            db: 0,
            retryStrategy: (times: number) => {
                // Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms, 1600ms, max 2000ms
                const delay = Math.min(times * 50, 2000);
                if (times > 1) {
                    logger.warn(`Redis reconnection attempt ${times}, retrying in ${delay}ms`);
                }
                return delay;
            },
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: false
        });

        this.redis.on('connect', () => {
            this.connectionState = 'connected';
            logger.info('Connected to Redis');
        });

        this.redis.on('ready', () => {
            this.connectionState = 'ready';
        });

        this.redis.on('error', (err: Error) => {
            this.connectionState = 'error';
            logger.error('Redis error:', err);
        });

        this.redis.on('close', () => {
            logger.warn('Redis connection closed');
            this.connectionState = 'end';
        });

        this.redis.on('reconnecting', (delay: number) => {
            this.connectionState = 'connecting';
            logger.debug(`Redis reconnecting in ${delay}ms`);
        });

        this.redis.on('end', () => {
            this.connectionState = 'end';
            logger.warn('Redis connection ended');
        });
    }

    /**
     * Gets the current connection state
     * @returns Current connection state
     */
    public getConnectionState(): 'connecting' | 'connected' | 'ready' | 'error' | 'end' {
        return this.connectionState;
    }

    /**
     * Checks if Redis connection is healthy
     * @returns Promise that resolves to true if connection is ready, false otherwise
     */
    public async isHealthy(): Promise<boolean> {
        try {
            if (this.connectionState === 'ready') {
                // Ping to verify connection is actually working
                const result = await this.redis.ping();
                return result === 'PONG';
            }
            return false;
        } catch (error) {
            logger.warn('Redis health check failed:', error);
            return false;
        }
    }

    public static getInstance(): RedisSingleton {
        if (!RedisSingleton.instance) {
            RedisSingleton.instance = new RedisSingleton();
        }
        return RedisSingleton.instance;
    }

    /**
     * Gets the Redis client instance
     * @returns Redis client
     */
    public getRedis(): Redis {
        return this.redis;
    }
}

const redisSingleton = RedisSingleton.getInstance();
export default redisSingleton.getRedis();

// Export singleton instance for health checks
export const redisSingletonInstance = redisSingleton;

