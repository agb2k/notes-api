import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';
import { VALIDATION_LIMITS } from '../constants';
import { NoteCategory } from '../constants/enums';

/**
 * Middleware factory that creates a validation middleware from express-validator chains
 * Runs all validations and throws ValidationError if any fail
 * @param validations - Array of express-validator validation chains
 * @returns Express middleware function
 * @throws {ValidationError} If validation fails
 */
export const validate = (validations: ValidationChain[]) => {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            await Promise.all(validations.map(validation => validation.run(req)));

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const errorMessages = errors.array().map(err => {
                    const field = 'param' in err ? err.param : 'field';
                    return `${field}: ${err.msg}`;
                }).join(', ');
                throw new ValidationError(errorMessages);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

export const registerValidation = [
    body('username')
        .trim()
        .isLength({ min: VALIDATION_LIMITS.USERNAME_MIN_LENGTH, max: VALIDATION_LIMITS.USERNAME_MAX_LENGTH })
        .withMessage(`Username must be between ${VALIDATION_LIMITS.USERNAME_MIN_LENGTH} and ${VALIDATION_LIMITS.USERNAME_MAX_LENGTH} characters`)
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('password')
        .isLength({ min: VALIDATION_LIMITS.PASSWORD_MIN_LENGTH })
        .withMessage(`Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN_LENGTH} characters long`)
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

export const loginValidation = [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
];

export const createNoteValidation = [
    body('content')
        .trim()
        .notEmpty()
        .withMessage('Content is required')
        .isLength({ max: VALIDATION_LIMITS.NOTE_CONTENT_MAX_LENGTH })
        .withMessage(`Content must not exceed ${VALIDATION_LIMITS.NOTE_CONTENT_MAX_LENGTH} characters`),
    body('category')
        .optional()
        .isIn([NoteCategory.WORK, NoteCategory.PERSONAL, NoteCategory.EDUCATION, null])
        .withMessage('Category must be Work, Personal, Education, or null'),
];

export const updateNoteValidation = [
    body('content')
        .optional()
        .trim()
        .isLength({ max: VALIDATION_LIMITS.NOTE_CONTENT_MAX_LENGTH })
        .withMessage(`Content must not exceed ${VALIDATION_LIMITS.NOTE_CONTENT_MAX_LENGTH} characters`),
    body('category')
        .optional()
        .isIn([NoteCategory.WORK, NoteCategory.PERSONAL, NoteCategory.EDUCATION, null])
        .withMessage('Category must be Work, Personal, Education, or null'),
    body('expectedVersion')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Expected version must be a positive integer'),
];

export const noteIdValidation = [
    param('noteId')
        .isUUID()
        .withMessage('Note ID must be a valid UUID'),
];

export const versionNumberValidation = [
    param('versionNumber')
        .isInt({ min: 1 })
        .withMessage('Version number must be a positive integer'),
];

export const searchValidation = [
    query('keywords')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Keywords cannot be empty if provided'),
];

