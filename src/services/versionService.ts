import db from '../models';
import { NotFoundError, UnauthorizedError } from '../utils/errors';
import logger from '../utils/logger';
import { invalidateNoteCache } from '../utils/cache';
import { ensureVersionExists, getCurrentVersionNumber } from '../utils/versionHelper';
import { DEFAULTS } from '../constants';
import { checkNoteAccess } from '../middleware/permissionMiddleware';
import { AccessPermission } from '../constants/enums';

const Note = db.notes;
const NoteVersion = db.noteVersions;

export class VersionService {
    static async getNoteVersions(noteId: string, userId: string): Promise<unknown[]> {
        try {
            const access = await checkNoteAccess(noteId, userId);
            if (!access.hasAccess) {
                throw new NotFoundError('Note not found');
            }

            const versions = await NoteVersion.findAll({
                where: { noteId },
                order: [['versionNumber', 'DESC']],
            });

            return versions;
        } catch (error: unknown) {
            logger.error('Error retrieving versions:', error);
            throw error;
        }
    }

    static async revertToVersion(noteId: string, userId: string, versionNumber: number): Promise<unknown> {
        const access = await checkNoteAccess(noteId, userId);
        if (!access.hasAccess) {
            throw new NotFoundError('Note not found');
        }
        if (access.permission === AccessPermission.READ) {
            throw new UnauthorizedError('You do not have edit permission for this note');
        }

        const transaction = await db.sequelize.transaction();
        
        try {
            const note = await Note.findByPk(noteId, { transaction });
            if (!note) {
                await transaction.rollback();
                throw new NotFoundError('Note not found');
            }

            const targetVersion = await NoteVersion.findOne({
                where: { noteId, versionNumber },
                transaction
            });

            if (!targetVersion) {
                await transaction.rollback();
                throw new NotFoundError('Version not found');
            }

            const currentVersionNumber = getCurrentVersionNumber(note);
            await ensureVersionExists(note.id!, currentVersionNumber, note, userId, transaction);

            note.content = targetVersion.content;
            note.category = targetVersion.category;
            note.version = (note.version || DEFAULTS.NOTE_VERSION) + 1;

            await note.save({ transaction });

            await transaction.commit();

            await invalidateNoteCache(noteId);

            return note;
        } catch (error: unknown) {
            if (transaction) {
                try {
                    await transaction.rollback();
                } catch (rollbackError) {
                    logger.warn('Transaction rollback failed (may already be rolled back)', rollbackError);
                }
            }
            logger.error('Error reverting note:', error);
            throw error;
        }
    }
}

