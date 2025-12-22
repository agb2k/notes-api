import { NoteInstance } from '../models/noteModel';
import { NoteResponse } from '../dto/note.dto';
import { DEFAULTS } from '../constants';

export const mapNoteToResponse = (note: NoteInstance): NoteResponse => {
    return {
        id: note.id!,
        content: note.content,
        userId: note.userId,
        category: note.category,
        version: note.version || DEFAULTS.NOTE_VERSION,
        createdAt: note.createdAt!,
        updatedAt: note.updatedAt!,
    };
};

