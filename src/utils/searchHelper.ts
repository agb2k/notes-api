import db from '../models';
import { VALIDATION_LIMITS } from '../constants';
import { ValidationError } from './errors';

export const escapeFullTextSearch = (keywords: string): string => {
    const trimmed = keywords.trim();
    
    if (trimmed.length > VALIDATION_LIMITS.NOTE_CONTENT_MAX_LENGTH) {
        throw new ValidationError('Search keywords are too long');
    }
    
    if (trimmed.length === 0) {
        throw new ValidationError('Search keywords cannot be empty');
    }
    
    const escaped = db.sequelize.escape(trimmed);
    return escaped.slice(1, -1);
};

