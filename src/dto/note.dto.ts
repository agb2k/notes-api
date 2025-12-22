import { CategoryType } from '../models/noteModel';

/**
 * Data Transfer Object for creating a new note
 */
export class CreateNoteDTO {
    /**
     * Note content (max 10000 characters)
     */
    public content!: string;

    /**
     * Optional category for the note
     */
    public category?: CategoryType;
}

/**
 * Data Transfer Object for updating a note
 */
export class UpdateNoteDTO {
    /**
     * Updated note content (max 10000 characters)
     */
    public content?: string;

    /**
     * Updated category for the note
     */
    public category?: CategoryType;

    /**
     * Expected version number for optimistic locking
     */
    public expectedVersion?: number;
}

/**
 * Response model for a note
 */
export class NoteResponse {
    public id!: string;
    public content!: string;
    public userId!: string;
    public category?: CategoryType | null;
    public version!: number;
    public createdAt!: Date;
    public updatedAt!: Date;
}

/**
 * Response model for note creation
 */
export class CreateNoteResponse {
    public message!: string;
    public note!: NoteResponse;
}

/**
 * Response model for note list
 */
export class NoteListResponse {
    public notes!: NoteResponse[];
}

/**
 * Response model for single note
 */
export class GetNoteResponse {
    public note!: NoteResponse;
}

/**
 * Response model for note update
 */
export class UpdateNoteResponse {
    public message!: string;
    public note!: NoteResponse;
}

/**
 * Response model for note deletion
 */
export class DeleteNoteResponse {
    public message!: string;
}
