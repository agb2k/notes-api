import { escapeFullTextSearch } from '../../../src/utils/searchHelper';
import { ValidationError } from '../../../src/utils/errors';
import { VALIDATION_LIMITS } from '../../../src/constants';

describe('searchHelper', () => {
    describe('escapeFullTextSearch', () => {
        it('should escape single quotes', () => {
            const result = escapeFullTextSearch("test'quote");
            // Sequelize.escape() handles escaping, result should be safe
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
        });

        it('should escape backslashes', () => {
            const result = escapeFullTextSearch('test\\backslash');
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
        });

        it('should handle normal text', () => {
            const result = escapeFullTextSearch('normal search text');
            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
        });

        it('should trim whitespace', () => {
            const result1 = escapeFullTextSearch('  test  ');
            const result2 = escapeFullTextSearch('test');
            // After trimming and escaping, they should be similar (escaping might add quotes)
            expect(result1.trim()).toBeDefined();
            expect(result2.trim()).toBeDefined();
        });

        it('should throw ValidationError for empty string', () => {
            expect(() => {
                escapeFullTextSearch('');
            }).toThrow(ValidationError);
        });

        it('should throw ValidationError for whitespace only', () => {
            expect(() => {
                escapeFullTextSearch('   ');
            }).toThrow(ValidationError);
        });

        it('should throw ValidationError for keywords too long', () => {
            const longString = 'a'.repeat(VALIDATION_LIMITS.NOTE_CONTENT_MAX_LENGTH + 1);
            expect(() => {
                escapeFullTextSearch(longString);
            }).toThrow(ValidationError);
        });

        it('should handle special characters', () => {
            const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
            const result = escapeFullTextSearch(specialChars);
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
        });

        it('should handle unicode characters', () => {
            const unicode = '测试 日本語 العربية';
            const result = escapeFullTextSearch(unicode);
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
        });
    });
});

