import { AuthRequest } from '../middleware/authMiddleware';
import { UnauthorizedError } from './errors';

export function hasUserId(req: AuthRequest): req is AuthRequest & { userId: string } {
    return typeof req.userId === 'string' && req.userId.length > 0;
}

export function requireUserId(req: AuthRequest): string {
    if (!hasUserId(req)) {
        throw new UnauthorizedError('User ID not found in request. Authentication required.');
    }
    return req.userId;
}

