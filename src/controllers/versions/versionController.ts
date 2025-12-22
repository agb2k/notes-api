import { Controller, Route, Tags, Security, Get, Post, Path, Request, Response as TsoaResponse } from 'tsoa';
import { requireUserId } from '../../utils/typeGuards';
import { VersionService } from '../../services/versionService';
import { AuthRequest } from '../../middleware/authMiddleware';
import { NoteResponse } from '../../dto/note.dto';
import { mapNoteToResponse } from '../../utils/noteMapper';
import { NoteInstance } from '../../models/noteModel';

@Route('notes')
@Tags('Versions')
@Security('bearerAuth')
export class VersionController extends Controller {
    /**
     * Retrieves all versions of a note, ordered by version number (newest first)
     */
    @Get('{noteId}/versions')
    @TsoaResponse(200, 'List of versions')
    @TsoaResponse(404, 'Note not found')
    @TsoaResponse(401, 'Unauthorized')
    public async getNoteVersions(
        @Path() noteId: string,
        @Request() req: AuthRequest
    ): Promise<{ versions: any[] }> {
        const userId = requireUserId(req);
        const versions = await VersionService.getNoteVersions(noteId, userId) as any[];
        
        return { versions };
    }

    /**
     * Reverts a note to a specific version number
     */
    @Post('{noteId}/revert/{versionNumber}')
    @TsoaResponse(200, 'Note reverted successfully')
    @TsoaResponse(404, 'Note or version not found')
    @TsoaResponse(401, 'Unauthorized')
    public async revertToVersion(
        @Path() noteId: string,
        @Path() versionNumber: number,
        @Request() req: AuthRequest
    ): Promise<{ message: string; note: NoteResponse; revertedFromVersion: number }> {
        const userId = requireUserId(req);
        const note = await VersionService.revertToVersion(noteId, userId, versionNumber) as NoteInstance;
        
        return {
            message: 'Note reverted successfully',
            note: mapNoteToResponse(note),
            revertedFromVersion: versionNumber,
        };
    }
}
