import CategoryFactory from '../../../src/factories/categoryFactory';
import { CategoryType } from '../../../src/models/noteModel';
import { NoteCategory } from '../../../src/constants/enums';

describe('CategoryFactory', () => {
    describe('createCategory', () => {
        it('should return valid category for Work', () => {
            const result = CategoryFactory.createCategory(NoteCategory.WORK);
            expect(result).toBe(NoteCategory.WORK);
        });

        it('should return valid category for Personal', () => {
            const result = CategoryFactory.createCategory(NoteCategory.PERSONAL);
            expect(result).toBe(NoteCategory.PERSONAL);
        });

        it('should return valid category for Education', () => {
            const result = CategoryFactory.createCategory(NoteCategory.EDUCATION);
            expect(result).toBe(NoteCategory.EDUCATION);
        });

        it('should return null for null input', () => {
            const result = CategoryFactory.createCategory(null);
            expect(result).toBeNull();
        });

        it('should throw error for invalid category', () => {
            expect(() => {
                CategoryFactory.createCategory('Invalid' as CategoryType);
            }).toThrow('Invalid category');
        });
    });
});

