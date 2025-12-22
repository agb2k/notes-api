import db from '../models';
import { NotFoundError, UnauthorizedError } from '../utils/errors';
import logger from '../utils/logger';
import { checkNoteAccess } from '../middleware/permissionMiddleware';
import fs from 'fs/promises';
import path from 'path';
import { invalidateNoteCache } from '../utils/cache';
import { AccessPermission } from '../constants/enums';

const Note = db.notes;
const NoteAttachment = db.noteAttachments;

export class AttachmentService {
    static async uploadAttachment(noteId: string, userId: string, file: Express.Multer.File): Promise<{
        id: string;
        fileName: string;
        fileType: string;
        fileSize: number;
        createdAt: Date;
    }> {

        try {
            const access = await checkNoteAccess(noteId, userId);
            if (!access.hasAccess) {
                throw new NotFoundError('Note not found');
            }
            if (access.permission === AccessPermission.READ) {
                throw new UnauthorizedError('You do not have edit permission for this note');
            }

            const note = await Note.findByPk(noteId);
            if (!note) {
                throw new NotFoundError('Note not found');
            }

            let filePath = file.path;
            
            if (!filePath) {
                const destination = file.destination || 'uploads/';
                const filename = file.filename || `${file.fieldname || 'file'}-${Date.now()}-${Math.round(Math.random() * 1E9)}-${path.extname(file.originalname)}`;
                
                if (path.isAbsolute(destination)) {
                    filePath = path.join(destination, filename);
                } else {
                    filePath = path.join(process.cwd(), destination, filename);
                }
                logger.warn('file.path not set, constructed path', { filePath, destination, filename });
            }
            
            if (!path.isAbsolute(filePath)) {
                filePath = path.join(process.cwd(), filePath);
            }
            filePath = path.normalize(filePath);
            
            if (!filePath) {
                throw new Error('Unable to determine file path');
            }

            const attachment = await NoteAttachment.create({
                noteId,
                fileName: file.originalname,
                filePath: filePath,
                fileType: file.mimetype,
                fileSize: file.size,
                uploadedByUserId: userId
            });

            await invalidateNoteCache(noteId);

            return {
                id: attachment.id!,
                fileName: attachment.fileName,
                fileType: attachment.fileType,
                fileSize: attachment.fileSize,
                createdAt: attachment.createdAt!
            };
        } catch (error: unknown) {
            if (file?.path) {
                try {
                    await fs.unlink(file.path);
                } catch (unlinkError) {
                    logger.warn('Failed to clean up uploaded file', { path: file.path, error: unlinkError });
                }
            }
            logger.error('Error uploading attachment:', error);
            throw error;
        }
    }

    static async getAttachments(noteId: string, userId: string): Promise<unknown[]> {
        try {
            const access = await checkNoteAccess(noteId, userId);
            if (!access.hasAccess) {
                throw new NotFoundError('Note not found');
            }

            const note = await Note.findByPk(noteId);
            if (!note) {
                throw new NotFoundError('Note not found');
            }

            const attachments = await NoteAttachment.findAll({
                where: { noteId },
                attributes: ['id', 'fileName', 'fileType', 'fileSize', 'createdAt', 'uploadedByUserId']
            });

            return attachments;
        } catch (error: unknown) {
            logger.error('Error retrieving attachments:', error);
            throw error;
        }
    }

    static async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
        try {
            const attachment = await NoteAttachment.findByPk(attachmentId);
            if (!attachment) {
                throw new NotFoundError('Attachment not found');
            }

            const access = await checkNoteAccess(attachment.noteId, userId);
            if (!access.hasAccess) {
                throw new NotFoundError('Note not found');
            }
            if (access.permission === AccessPermission.READ) {
                throw new UnauthorizedError('You do not have edit permission for this note');
            }

            try {
                await fs.unlink(attachment.filePath);
            } catch (unlinkError) {
                logger.warn('Failed to delete file from filesystem', { path: attachment.filePath, error: unlinkError });
            }

            await attachment.destroy();

            await invalidateNoteCache(attachment.noteId);
        } catch (error: unknown) {
            logger.error('Error deleting attachment:', error);
            throw error;
        }
    }

    static async getAttachmentForDownload(attachmentId: string, userId: string): Promise<{
        filePath: string;
        fileName: string;
        fileType: string;
        fileSize: number;
    }> {
        try {
            const attachment = await NoteAttachment.findByPk(attachmentId);
            if (!attachment) {
                throw new NotFoundError('Attachment not found');
            }

            const access = await checkNoteAccess(attachment.noteId, userId);
            if (!access.hasAccess) {
                throw new NotFoundError('Note not found');
            }

            const uploadsDir = path.join(process.cwd(), 'uploads');
            let filePath = attachment.filePath;
            
            if (!filePath || filePath.trim() === '') {
                const filename = attachment.fileName;
                filePath = path.join(uploadsDir, filename);
            } else {
                if (!path.isAbsolute(filePath)) {
                    filePath = path.join(process.cwd(), filePath);
                }
                filePath = path.normalize(filePath);
            }
            
            let fileExists = false;
            try {
                await fs.access(filePath);
                fileExists = true;
            } catch (accessError) {
                logger.warn('File not found at stored path, trying fallback search', {
                    storedPath: filePath,
                    error: accessError instanceof Error ? accessError.message : String(accessError)
                });
                try {
                    const uploadsDir = path.join(process.cwd(), 'uploads');
                    const files = await fs.readdir(uploadsDir);
                    
                    const ext = path.extname(attachment.fileName);
                    const baseName = path.basename(attachment.fileName, ext).toLowerCase();
                    
                    let pathBasedMatch: string | undefined;
                    if (attachment.filePath) {
                        const pathFilename = path.basename(attachment.filePath);
                        pathBasedMatch = files.find(f => f === pathFilename);
                        if (!pathBasedMatch && !pathFilename.startsWith('file-')) {
                            pathBasedMatch = files.find(f => f === `file-${pathFilename}`);
                        }
                        if (!pathBasedMatch && pathFilename.startsWith('file-')) {
                            const withoutPrefix = pathFilename.substring(5);
                            pathBasedMatch = files.find(f => f === withoutPrefix || f === pathFilename);
                        }
                        if (!pathBasedMatch) {
                            pathBasedMatch = files.find(f => {
                                const actualBase = f.startsWith('file-') ? f.substring(5) : f;
                                return actualBase === pathFilename || f.includes(pathFilename) || pathFilename.includes(actualBase);
                            });
                        }
                    }
                    
                    let multerMatch: string | undefined;
                    if (attachment.filePath) {
                        const pathBasename = path.basename(attachment.filePath);
                        const timestampMatch = pathBasename.match(/(\d+)-/);
                        if (timestampMatch) {
                            const timestamp = timestampMatch[1];
                            multerMatch = files.find(f => {
                                const hasTimestamp = f.includes(timestamp);
                                const hasExt = f.endsWith(ext);
                                return hasTimestamp && hasExt;
                            });
                        }
                    }
                    if (!multerMatch) {
                        multerMatch = files.find(f => f.startsWith('file-') && f.endsWith(ext));
                    }
                    
                    let sizeMatch: string | undefined;
                    try {
                        for (const f of files.filter(file => file.endsWith(ext))) {
                            const filePath = path.join(uploadsDir, f);
                            const stats = await fs.stat(filePath);
                            const sizeDiff = Math.abs(stats.size - attachment.fileSize);
                            const tolerance = Math.max(1024, attachment.fileSize * 0.01);
                            if (sizeDiff <= tolerance) {
                                sizeMatch = f;
                                break;
                            }
                        }
                    } catch (statError) {
                        logger.warn('Error checking file sizes', { error: statError instanceof Error ? statError.message : String(statError) });
                    }
                    
                    const partialMatch = files.find(f => {
                        const fLower = f.toLowerCase();
                        return fLower.includes(baseName) || baseName.includes(fLower.split('.')[0]);
                    });
                    
                    const extMatch = files.find(f => f.endsWith(ext));
                    
                    const matchingFile = pathBasedMatch || multerMatch || sizeMatch || partialMatch || extMatch;
                    
                    if (matchingFile) {
                        filePath = path.join(uploadsDir, matchingFile);
                        await fs.access(filePath);
                        fileExists = true;
                    } else {
                        logger.warn('No matching file found in uploads directory', { files, searchFor: attachment.fileName, storedPath: attachment.filePath });
                    }
                } catch (fallbackError) {
                    logger.error('Fallback file search failed', { error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError), stack: fallbackError instanceof Error ? fallbackError.stack : undefined });
                }
                
                if (!fileExists) {
                    throw new NotFoundError('File not found on server');
                }
            }

            return {
                filePath: filePath,
                fileName: attachment.fileName,
                fileType: attachment.fileType,
                fileSize: attachment.fileSize
            };
        } catch (error: unknown) {
            logger.error('Error getting attachment for download:', error);
            throw error;
        }
    }
}

