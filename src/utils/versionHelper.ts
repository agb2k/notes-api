import db from '../models';
import { NoteInstance } from '../models/noteModel';
import { DEFAULTS } from '../constants';
import logger from './logger';
import { Transaction } from 'sequelize';

const NoteVersion = db.noteVersions;

export const ensureVersionExists = async (
    noteId: string,
    versionNumber: number,
    note: NoteInstance,
    userId: string,
    transaction?: Transaction
): Promise<void> => {
    try {
        const existingVersion = await NoteVersion.findOne({
            where: { noteId, versionNumber },
            transaction
        });

        if (!existingVersion) {
            await NoteVersion.create({
                noteId,
                content: note.content,
                category: note.category,
                versionNumber,
                createdBy: userId,
            }, { transaction });
        }
    } catch (error) {
        logger.error('Error ensuring version exists', { noteId, versionNumber, error });
        throw error;
    }
};

export const getCurrentVersionNumber = (note: NoteInstance): number => {
    return note.version ?? DEFAULTS.NOTE_VERSION;
};

