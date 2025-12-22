import { Response, NextFunction } from 'express';
import db from '../models';
import { AuthRequest } from './authMiddleware';
import { UnauthorizedError, NotFoundError } from '../utils/errors';
import { requireUserId } from '../utils/typeGuards';
import { SharePermission, AccessPermission } from '../constants/enums';

const Note = db.notes;
const NoteShare = db.noteShares;

export const checkNotePermission = (requiredPermission: SharePermission) => {
    return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = requireUserId(req);
            const noteId = req.params.noteId;

            if (!noteId) {
                throw new NotFoundError('Note ID is required');
            }

            const note = await Note.findByPk(noteId);
            if (!note) {
                throw new NotFoundError('Note not found');
            }

            if (note.userId === userId) {
                next();
                return;
            }

            const share = await NoteShare.findOne({
                where: {
                    noteId,
                    sharedWithUserId: userId
                }
            });

            if (!share) {
                throw new UnauthorizedError('You do not have permission to access this note');
            }

            if (requiredPermission === SharePermission.EDIT && share.permission !== SharePermission.EDIT) {
                throw new UnauthorizedError('You do not have edit permission for this note');
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

export const checkNoteAccess = async (
    noteId: string,
    userId: string
): Promise<{ hasAccess: boolean; permission: AccessPermission | null }> => {
    const note = await Note.findByPk(noteId);
    if (!note) {
        return { hasAccess: false, permission: null };
    }

    if (note.userId === userId) {
        return { hasAccess: true, permission: AccessPermission.OWNER };
    }

    const share = await NoteShare.findOne({
        where: {
            noteId,
            sharedWithUserId: userId
        }
    });

    if (!share) {
        return { hasAccess: false, permission: null };
    }

    const accessPermission = share.permission === SharePermission.READ 
        ? AccessPermission.READ 
        : AccessPermission.EDIT;
    
    return { hasAccess: true, permission: accessPermission };
};

