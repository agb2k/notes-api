import { Response } from 'express';
import { Controller, Route, Tags, Security, Post, Get, Delete, Path, Request, Response as TsoaResponseDecorator, UploadedFile } from 'tsoa';
import { requireUserId } from '../../utils/typeGuards';
import { AttachmentService } from '../../services/attachmentService';
import { AuthRequest } from '../../middleware/authMiddleware';
import logger from '../../utils/logger';
import fs from 'fs/promises';
import { createReadStream } from 'fs';

@Route('notes')
@Tags('Attachments')
@Security('bearerAuth')
export class AttachmentController extends Controller {
    /**
     * Uploads a file attachment for a note
     */
    @Post('{noteId}/attachments')
    @TsoaResponseDecorator(201, 'Attachment uploaded successfully')
    @TsoaResponseDecorator(400, 'Validation error or file too large')
    @TsoaResponseDecorator(401, 'Unauthorized')
    @TsoaResponseDecorator(404, 'Note not found')
    public async uploadAttachment(
        @Path() noteId: string,
        @UploadedFile() file: Express.Multer.File,
        @Request() req: AuthRequest & { file?: Express.Multer.File; files?: { [fieldname: string]: Express.Multer.File[] } }
    ): Promise<{ message: string; attachment: any }> {
        const userId = requireUserId(req);
        
        // Handle both single file (req.file) and fields (req.files.file[0])
        let uploadFile: Express.Multer.File | undefined = file || req.file;
        if (!uploadFile && req.files && req.files.file && Array.isArray(req.files.file) && req.files.file.length > 0) {
            uploadFile = req.files.file[0];
        }

        if (!uploadFile) {
            throw new Error('No file provided');
        }

        try {
            const attachment = await AttachmentService.uploadAttachment(noteId, userId, uploadFile);
            
            return {
                message: 'Attachment uploaded successfully',
                attachment
            };
        } catch (error: unknown) {
            // Clean up uploaded file on error
            if (uploadFile?.path) {
                try {
                    await fs.unlink(uploadFile.path);
                } catch {
                    // Ignore cleanup errors
                }
            }
            throw error;
        }
    }

    /**
     * Gets all attachments for a note
     */
    @Get('{noteId}/attachments')
    @TsoaResponseDecorator(200, 'List of attachments')
    @TsoaResponseDecorator(401, 'Unauthorized')
    @TsoaResponseDecorator(404, 'Note not found')
    public async getAttachments(
        @Path() noteId: string,
        @Request() req: AuthRequest
    ): Promise<{ attachments: any[] }> {
        const userId = requireUserId(req);
        const attachments = await AttachmentService.getAttachments(noteId, userId);
        
        return {
            attachments: attachments as any[]
        };
    }
}

@Route('attachments')
@Tags('Attachments')
@Security('bearerAuth')
export class AttachmentDownloadController extends Controller {
    /**
     * Downloads an attachment file
     */
    @Get('{attachmentId}/download')
    @TsoaResponseDecorator(200, 'File download')
    @TsoaResponseDecorator(401, 'Unauthorized')
    @TsoaResponseDecorator(404, 'Attachment not found')
    public async downloadAttachment(
        @Path() attachmentId: string,
        @Request() req: AuthRequest
    ): Promise<void> {
        const userId = requireUserId(req);
        
        const attachment = await AttachmentService.getAttachmentForDownload(attachmentId, userId);
        
        // Access Express response from request - Express attaches it
        const expressRes = (req as any).res as Response;
        
        if (!expressRes) {
            // Try alternative: response might be in a different location
            const res = (req as any).response || (req as any).res;
            if (!res || typeof res.setHeader !== 'function') {
                throw new Error('Unable to access Express response object for file download');
            }
            // Set headers explicitly for proper file download
            res.setHeader('Content-Type', attachment.fileType);
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.fileName)}"`);
            res.setHeader('Content-Length', attachment.fileSize.toString());
            
            // Use a read stream to ensure binary mode and proper handling
            const fileStream = createReadStream(attachment.filePath);
            fileStream.on('error', (err: Error) => {
                logger.error('Error reading file stream', { error: err, attachmentId, filePath: attachment.filePath });
                if (!res.headersSent) {
                    res.status(500).json({ error: { message: 'Error downloading file', code: 'InternalServerError' } });
                }
            });
            fileStream.pipe(res);
            return;
        }
        
        // Verify file exists before streaming
        try {
            await fs.access(attachment.filePath);
        } catch (accessError) {
            logger.error('File does not exist', { attachmentId, filePath: attachment.filePath, error: accessError });
            throw new Error('File not found on server');
        }
        
        // Set headers explicitly for proper file download
        expressRes.setHeader('Content-Type', attachment.fileType);
        expressRes.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.fileName)}"`);
        expressRes.setHeader('Content-Length', attachment.fileSize.toString());
        
        // Use a read stream to ensure binary mode and proper handling
        const fileStream = createReadStream(attachment.filePath);
        
        fileStream.on('error', (err: Error) => {
            logger.error('Error reading file stream', { error: err, attachmentId, filePath: attachment.filePath });
            if (!expressRes.headersSent) {
                expressRes.status(500).json({ error: { message: 'Error downloading file', code: 'InternalServerError' } });
            } else {
                expressRes.destroy();
            }
        });
        
        // Wait for stream to finish before returning (so TSOA doesn't interfere)
        return new Promise<void>((resolve, reject) => {
            fileStream.on('end', () => {
                resolve();
            });
            fileStream.on('error', (err: Error) => {
                reject(err);
            });
            fileStream.pipe(expressRes, { end: true });
        });
    }

    /**
     * Deletes an attachment
     */
    @Delete('{attachmentId}')
    @TsoaResponseDecorator(200, 'Attachment deleted successfully')
    @TsoaResponseDecorator(401, 'Unauthorized')
    @TsoaResponseDecorator(404, 'Attachment not found')
    public async deleteAttachment(
        @Path() attachmentId: string,
        @Request() req: AuthRequest
    ): Promise<{ message: string }> {
        const userId = requireUserId(req);
        await AttachmentService.deleteAttachment(attachmentId, userId);
        
        return {
            message: 'Attachment deleted successfully'
        };
    }
}
