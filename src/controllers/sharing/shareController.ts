import { Controller, Route, Tags, Security, Post, Get, Delete, Body, Path, Request, Response as TsoaResponse } from 'tsoa';
import { requireUserId } from '../../utils/typeGuards';
import { ShareService } from '../../services/shareService';
import { ShareNoteDTO, ShareNoteResponse, UnshareNoteResponse, SharedNotesResponse, NoteSharesResponse } from '../../dto/share.dto';
import { AuthRequest } from '../../middleware/authMiddleware';

@Route('notes')
@Tags('Sharing')
@Security('bearerAuth')
export class ShareController extends Controller {
    /**
     * Shares a note with another user
     */
    @Post('{noteId}/share')
    @TsoaResponse(201, 'Note shared successfully')
    @TsoaResponse(200, 'Share permission updated successfully')
    @TsoaResponse(400, 'Validation error')
    @TsoaResponse(401, 'Unauthorized')
    @TsoaResponse(404, 'Note or user not found')
    @TsoaResponse(409, 'Note already shared with user')
    public async shareNote(
        @Path() noteId: string,
        @Body() body: ShareNoteDTO,
        @Request() req: AuthRequest
    ): Promise<ShareNoteResponse> {
        const userId = requireUserId(req);
        const result = await ShareService.shareNote(noteId, userId, body);
        
        return result as ShareNoteResponse;
    }

    /**
     * Removes a share from a note
     */
    @Delete('{noteId}/share/{userId}')
    @TsoaResponse(200, 'Note unshared successfully')
    @TsoaResponse(401, 'Unauthorized')
    @TsoaResponse(404, 'Note or share not found')
    public async unshareNote(
        @Path() noteId: string,
        @Path() userId: string,
        @Request() req: AuthRequest
    ): Promise<UnshareNoteResponse> {
        const currentUserId = requireUserId(req);
        await ShareService.unshareNote(noteId, currentUserId, userId);
        
        return {
            message: 'Note unshared successfully'
        };
    }

    /**
     * Gets all notes shared with the authenticated user
     */
    @Get('shared')
    @TsoaResponse(200, 'List of shared notes')
    @TsoaResponse(401, 'Unauthorized')
    public async getSharedNotes(
        @Request() req: AuthRequest
    ): Promise<SharedNotesResponse> {
        const userId = requireUserId(req);
        const notes = await ShareService.getSharedNotes(userId);
        
        return {
            notes: notes as any[]
        };
    }

    /**
     * Gets all users a note is shared with
     */
    @Get('{noteId}/shares')
    @TsoaResponse(200, 'List of shares')
    @TsoaResponse(401, 'Unauthorized')
    @TsoaResponse(404, 'Note not found')
    public async getNoteShares(
        @Path() noteId: string,
        @Request() req: AuthRequest
    ): Promise<NoteSharesResponse> {
        const userId = requireUserId(req);
        const shares = await ShareService.getNoteShares(noteId, userId) as any[];
        
        return {
            shares: shares.map(share => ({
                id: share.id,
                userId: share.userId,
                username: share.username,
                permission: share.permission,
                createdAt: share.createdAt
            }))
        };
    }
}
