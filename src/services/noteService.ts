import db from '../models';
import CategoryFactory from '../factories/categoryFactory';
import { Op, Sequelize } from 'sequelize';
import { NotFoundError, ConflictError, UnauthorizedError } from '../utils/errors';
import logger from '../utils/logger';
import { CACHE_TTL, DEFAULTS } from '../constants';
import { invalidateNoteCache, getCachedData, setCachedData } from '../utils/cache';
import { ensureVersionExists, getCurrentVersionNumber } from '../utils/versionHelper';
import { checkNoteAccess } from '../middleware/permissionMiddleware';
import { CreateNoteDTO, UpdateNoteDTO } from '../dto/note.dto';
import { escapeFullTextSearch } from '../utils/searchHelper';
import { AccessPermission } from '../constants/enums';

const Note = db.notes;
const NoteShare = db.noteShares;

export class NoteService {
    static async createNote(userId: string, data: CreateNoteDTO): Promise<unknown> {
        try {
            const validatedCategory = data.category !== undefined ? CategoryFactory.createCategory(data.category) : null;

            const note = await Note.create({
                content: data.content,
                userId,
                category: validatedCategory,
                version: DEFAULTS.NOTE_VERSION,
            });

            await ensureVersionExists(note.id!, 1, note, userId);

            await invalidateNoteCache(note.id!);

            return note;
        } catch (error: unknown) {
            logger.error('Error creating note:', error);
            throw error;
        }
    }

    static async listNotes(userId: string): Promise<unknown[]> {
        try {
            const cacheKey = `notes:${userId}`;
            
            const cachedNotes = await getCachedData<{ notes: unknown[] }>(cacheKey);
            if (cachedNotes) {
                return cachedNotes.notes;
            }

            const [ownedNotes, sharedNoteIds] = await Promise.all([
                Note.findAll({ where: { userId } }),
                NoteShare.findAll({
                    where: { sharedWithUserId: userId },
                    attributes: ['noteId']
                })
            ]);

            const sharedNoteIdList = sharedNoteIds.map(share => share.noteId);
            const sharedNotes = sharedNoteIdList.length > 0
                ? await Note.findAll({ where: { id: { [Op.in]: sharedNoteIdList } } })
                : [];

            const allNotes = [...ownedNotes, ...sharedNotes];
            const uniqueNotes = Array.from(
                new Map(allNotes.map(note => [note.id, note])).values()
            );

            const result = { notes: uniqueNotes };

            await setCachedData(cacheKey, result, CACHE_TTL.NOTES_LIST);

            return uniqueNotes;
        } catch (error: unknown) {
            logger.error('Error retrieving notes:', error);
            throw error;
        }
    }

    static async searchNotes(userId: string, keywords: string): Promise<unknown[]> {
        try {
            const searchKeywords = keywords.trim();
            if (!searchKeywords) {
                return [];
            }

            const cacheKey = `notes:search:${userId}:${searchKeywords}`;
            
            const cachedResults = await getCachedData<{ notes: unknown[] }>(cacheKey);
            if (cachedResults) {
                return cachedResults.notes;
            }

            const escapedKeywords = escapeFullTextSearch(searchKeywords);
            const notes = await Note.findAll({
                where: {
                    userId,
                    [Op.and]: [
                        Sequelize.literal(`MATCH(content) AGAINST('${escapedKeywords}' IN NATURAL LANGUAGE MODE)`)
                    ]
                },
            });

            const result = { notes };
            await setCachedData(cacheKey, result, CACHE_TTL.SEARCH_RESULTS);

            return notes;
        } catch (error: unknown) {
            logger.error('Error searching notes:', error);
            throw error;
        }
    }

    static async getNoteById(noteId: string, userId: string): Promise<unknown> {
        try {
            const cacheKey = `note:${noteId}`;
            const cachedNote = await getCachedData<{ note: unknown }>(cacheKey);
            if (cachedNote) {
                return cachedNote.note;
            }

            const access = await checkNoteAccess(noteId, userId);
            if (!access.hasAccess) {
                throw new NotFoundError('Note not found');
            }

            const note = await Note.findByPk(noteId);
            if (!note) {
                throw new NotFoundError('Note not found');
            }

            await setCachedData(cacheKey, { note }, CACHE_TTL.NOTE);

            return note;
        } catch (error: unknown) {
            logger.error('Error retrieving note:', error);
            throw error;
        }
    }

    static async updateNote(noteId: string, userId: string, data: UpdateNoteDTO): Promise<unknown> {
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

            const isOwner = note.userId === userId;

            if (data.expectedVersion !== undefined && note.version !== data.expectedVersion) {
                await transaction.rollback();
                throw new ConflictError(`Concurrent modification detected. Current version: ${note.version}, provided version: ${data.expectedVersion}`);
            }

            const currentVersionNumber = getCurrentVersionNumber(note);
            await ensureVersionExists(note.id!, currentVersionNumber, note, userId, transaction);

            const validatedCategory = data.category !== undefined ? CategoryFactory.createCategory(data.category) : note.category;

            if (data.content !== undefined) {
                note.content = data.content;
            }
            note.category = validatedCategory;
            note.version = (note.version || DEFAULTS.NOTE_VERSION) + 1;
            
            const whereClause: { id: string; version: number; userId?: string } = {
                id: noteId,
                version: currentVersionNumber,
            };
            
            if (isOwner) {
                whereClause.userId = userId;
            }

            const [affectedRows] = await Note.update(
                {
                    content: note.content,
                    category: validatedCategory,
                    version: note.version,
                },
                {
                    where: whereClause,
                    transaction
                }
            );

            if (affectedRows === 0) {
                await transaction.rollback();
                const currentNote = await Note.findByPk(noteId);
                if (currentNote) {
                    throw new ConflictError(`Concurrent modification detected. Current version: ${currentNote.version}`);
                }
                throw new ConflictError('Concurrent modification detected');
            }

            await transaction.commit();

            await note.reload();

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
            logger.error('Error updating note:', error);
            throw error;
        }
    }

    static async deleteNote(noteId: string, userId: string): Promise<void> {
        try {
            const note = await Note.findOne({ where: { id: noteId, userId } });
            if (!note) {
                throw new NotFoundError('Note not found');
            }

            const shares = await NoteShare.findAll({
                where: { noteId },
                attributes: ['sharedWithUserId']
            });

            const userIds = new Set<string>();
            if (note.userId) {
                userIds.add(note.userId);
            }
            shares.forEach(share => {
                if (share.sharedWithUserId) {
                    userIds.add(share.sharedWithUserId);
                }
            });

            await note.destroy();

            await invalidateNoteCache(noteId, undefined, Array.from(userIds));
        } catch (error: unknown) {
            logger.error('Error deleting note:', error);
            throw error;
        }
    }
}

