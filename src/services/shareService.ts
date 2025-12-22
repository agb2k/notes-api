import db from '../models';
import { NotFoundError, ValidationError, ConflictError, UnauthorizedError } from '../utils/errors';
import logger from '../utils/logger';
import { invalidateNoteCache } from '../utils/cache';
import { ShareNoteDTO } from '../dto/share.dto';
import { NoteInstance } from '../models/noteModel';
import { NoteShareInstance } from '../models/noteShareModel';
import { UserInstance } from '../models/userModel';
import { SharePermission } from '../constants/enums';

const Note = db.notes;
const NoteShare = db.noteShares;
const User = db.users;

interface ShareWithNote extends NoteShareInstance {
    note: NoteInstance;
}

interface ShareWithUser extends NoteShareInstance {
    sharedWithUser?: UserInstance;
}

export class ShareService {
    static async shareNote(noteId: string, userId: string, data: ShareNoteDTO): Promise<{ message: string; share?: unknown }> {
        try {
            if (data.permission !== SharePermission.READ && data.permission !== SharePermission.EDIT) {
                throw new ValidationError('Permission must be "read" or "edit"');
            }

            if (!data.userId && !data.username) {
                throw new ValidationError('Either userId or username must be provided');
            }

            const note = await Note.findByPk(noteId);
            if (!note) {
                throw new NotFoundError('Note not found');
            }

            if (note.userId !== userId) {
                throw new UnauthorizedError('You can only share notes you own');
            }

            let user;
            if (data.userId) {
                user = await User.findByPk(data.userId);
            } else if (data.username) {
                user = await User.findOne({ where: { username: data.username } });
            }

            if (!user) {
                throw new NotFoundError('User not found');
            }

            const finalSharedWithUserId = user.id!;

            if (finalSharedWithUserId === userId) {
                throw new ValidationError('Cannot share note with yourself');
            }

            const existingShare = await NoteShare.findOne({
                where: {
                    noteId,
                    sharedWithUserId: finalSharedWithUserId
                }
            });

            if (existingShare) {
                if (existingShare.permission !== data.permission) {
                    existingShare.permission = data.permission;
                    await existingShare.save();
                    await invalidateNoteCache(noteId);
                    return {
                        message: 'Share permission updated successfully',
                        share: existingShare
                    };
                }
                throw new ConflictError('Note is already shared with this user');
            }

            const share = await NoteShare.create({
                noteId,
                sharedWithUserId: finalSharedWithUserId,
                permission: data.permission,
                sharedByUserId: userId
            });

            await invalidateNoteCache(noteId);

            return {
                message: 'Note shared successfully',
                share
            };
        } catch (error: unknown) {
            logger.error('Error sharing note:', error);
            throw error;
        }
    }

    static async unshareNote(noteId: string, userId: string, sharedWithUserId: string): Promise<void> {
        try {
            const note = await Note.findByPk(noteId);
            if (!note) {
                throw new NotFoundError('Note not found');
            }

            if (note.userId !== userId) {
                throw new UnauthorizedError('You can only unshare notes you own');
            }

            const share = await NoteShare.findOne({
                where: {
                    noteId,
                    sharedWithUserId
                }
            });

            if (!share) {
                throw new NotFoundError('Share not found');
            }

            const shares = await NoteShare.findAll({
                where: { noteId },
                attributes: ['sharedWithUserId']
            });

            const userIds = new Set<string>();
            if (note.userId) {
                userIds.add(note.userId);
            }
            shares.forEach(s => {
                if (s.sharedWithUserId) {
                    userIds.add(s.sharedWithUserId);
                }
            });

            await share.destroy();

            await invalidateNoteCache(noteId, undefined, Array.from(userIds));
        } catch (error: unknown) {
            logger.error('Error unsharing note:', error);
            throw error;
        }
    }

    static async getSharedNotes(userId: string): Promise<unknown[]> {
        try {
            const shares = await NoteShare.findAll({
                where: { sharedWithUserId: userId },
                include: [{
                    model: Note,
                    as: 'note',
                    required: true
                }]
            });

            const notes = shares.map(share => {
                const shareWithNote = share as unknown as ShareWithNote;
                const note = shareWithNote.note;
                return {
                    ...note.toJSON(),
                    permission: share.permission,
                    sharedBy: share.sharedByUserId
                };
            });

            return notes;
        } catch (error: unknown) {
            logger.error('Error retrieving shared notes:', error);
            throw error;
        }
    }

    static async getNoteShares(noteId: string, userId: string): Promise<unknown[]> {
        try {
            const note = await Note.findByPk(noteId);
            if (!note) {
                throw new NotFoundError('Note not found');
            }

            if (note.userId !== userId) {
                throw new UnauthorizedError('You can only view shares for notes you own');
            }

            const shares = await NoteShare.findAll({
                where: { noteId },
                include: [{
                    model: User,
                    as: 'sharedWithUser',
                    attributes: ['id', 'username']
                }]
            });

            return shares.map(share => {
                const shareWithUser = share as unknown as ShareWithUser;
                const sharedWithUser = shareWithUser.sharedWithUser;
                return {
                    id: share.id,
                    userId: share.sharedWithUserId,
                    username: sharedWithUser?.username,
                    permission: share.permission,
                    createdAt: share.createdAt
                };
            });
        } catch (error: unknown) {
            logger.error('Error retrieving note shares:', error);
            throw error;
        }
    }
}

