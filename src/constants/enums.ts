/**
 * Permission levels for note sharing
 */
export enum SharePermission {
    READ = 'read',
    EDIT = 'edit'
}

/**
 * Access permission levels (includes owner for access checks)
 */
export enum AccessPermission {
    READ = 'read',
    EDIT = 'edit',
    OWNER = 'owner'
}

/**
 * Note categories
 */
export enum NoteCategory {
    WORK = 'Work',
    PERSONAL = 'Personal',
    EDUCATION = 'Education'
}

