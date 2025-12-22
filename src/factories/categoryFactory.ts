import { CategoryType } from '../models/noteModel';
import { ValidationError } from '../utils/errors';
import { NoteCategory } from '../constants/enums';

class CategoryFactory {
    private static readonly ALLOWED_CATEGORIES: readonly CategoryType[] = [NoteCategory.WORK, NoteCategory.PERSONAL, NoteCategory.EDUCATION, null] as const;

    static createCategory(categoryName: CategoryType): CategoryType {
        if (!this.ALLOWED_CATEGORIES.includes(categoryName)) {
            throw new ValidationError('Invalid category. Allowed values are Work, Personal, Education, or null.');
        }
        return categoryName;
    }
}

export default CategoryFactory;

