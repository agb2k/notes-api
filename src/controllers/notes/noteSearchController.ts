import { Controller, Route, Tags, Security, Get, Query, Request, Response as TsoaResponse } from 'tsoa';
import { requireUserId } from '../../utils/typeGuards';
import { NoteService } from '../../services/noteService';
import { NoteListResponse } from '../../dto/note.dto';
import { AuthRequest } from '../../middleware/authMiddleware';
import { mapNoteToResponse } from '../../utils/noteMapper';
import { NoteInstance } from '../../models/noteModel';

@Route('notes/search')
@Tags('Search')
@Security('bearerAuth')
export class NoteSearchController extends Controller {
    /**
     * Searches notes using full-text search
     */
    @Get()
    @TsoaResponse(200, 'Search results')
    @TsoaResponse(401, 'Unauthorized')
    public async searchNotes(
        @Query() keywords: string,
        @Request() req: AuthRequest
    ): Promise<NoteListResponse> {
        const userId = requireUserId(req);
        
        if (!keywords || !keywords.trim()) {
            return { notes: [] };
        }
        
        const notes = await NoteService.searchNotes(userId, keywords) as NoteInstance[];
        
        return {
            notes: notes.map(note => mapNoteToResponse(note)),
        };
    }
}
