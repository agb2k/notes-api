import { Controller, Route, Tags, Security, Post, Get, Put, Delete, Body, Path, Request, Response as TsoaResponse } from 'tsoa';
import { requireUserId } from '../../utils/typeGuards';
import { NoteService } from '../../services/noteService';
import { CreateNoteDTO, UpdateNoteDTO, CreateNoteResponse, NoteListResponse, GetNoteResponse, UpdateNoteResponse, DeleteNoteResponse } from '../../dto/note.dto';
import { AuthRequest } from '../../middleware/authMiddleware';
import { mapNoteToResponse } from '../../utils/noteMapper';
import { NoteInstance } from '../../models/noteModel';

@Route('notes')
@Tags('Notes')
@Security('bearerAuth')
export class NoteController extends Controller {
    /**
     * Creates a new note for the authenticated user
     */
    @Post()
    @TsoaResponse(201, 'Note created successfully')
    @TsoaResponse(400, 'Validation error')
    @TsoaResponse(401, 'Unauthorized')
    public async createNote(
        @Body() body: CreateNoteDTO,
        @Request() req: AuthRequest
    ): Promise<CreateNoteResponse> {
        const userId = requireUserId(req);
        const note = await NoteService.createNote(userId, body) as NoteInstance;
        
        return {
            message: 'Note created successfully',
            note: mapNoteToResponse(note),
        };
    }

    /**
     * Lists all notes for the authenticated user (owned + shared)
     */
    @Get()
    @TsoaResponse(200, 'List of notes')
    @TsoaResponse(401, 'Unauthorized')
    public async listNotes(
        @Request() req: AuthRequest
    ): Promise<NoteListResponse> {
        const userId = requireUserId(req);
        const notes = await NoteService.listNotes(userId) as NoteInstance[];
        
        return {
            notes: notes.map(note => mapNoteToResponse(note)),
        };
    }

    /**
     * Retrieves a specific note by ID for the authenticated user
     */
    @Get('{noteId}')
    @TsoaResponse(200, 'Note details')
    @TsoaResponse(404, 'Note not found')
    @TsoaResponse(401, 'Unauthorized')
    public async getNote(
        @Path() noteId: string,
        @Request() req: AuthRequest
    ): Promise<GetNoteResponse> {
        const userId = requireUserId(req);
        const note = await NoteService.getNoteById(noteId, userId) as NoteInstance;
        
        return {
            note: mapNoteToResponse(note),
        };
    }

    /**
     * Updates a note with optimistic locking support
     */
    @Put('{noteId}')
    @TsoaResponse(200, 'Note updated successfully')
    @TsoaResponse(404, 'Note not found')
    @TsoaResponse(409, 'Concurrent modification detected')
    @TsoaResponse(401, 'Unauthorized')
    public async updateNote(
        @Path() noteId: string,
        @Body() body: UpdateNoteDTO,
        @Request() req: AuthRequest
    ): Promise<UpdateNoteResponse> {
        const userId = requireUserId(req);
        const note = await NoteService.updateNote(noteId, userId, body) as NoteInstance;
        
        return {
            message: 'Note updated successfully',
            note: mapNoteToResponse(note),
        };
    }

    /**
     * Soft deletes a note (marks with deletedAt timestamp)
     */
    @Delete('{noteId}')
    @TsoaResponse(200, 'Note deleted successfully')
    @TsoaResponse(404, 'Note not found')
    @TsoaResponse(401, 'Unauthorized')
    public async deleteNote(
        @Path() noteId: string,
        @Request() req: AuthRequest
    ): Promise<DeleteNoteResponse> {
        const userId = requireUserId(req);
        await NoteService.deleteNote(noteId, userId);
        
        return {
            message: 'Note deleted successfully',
        };
    }
}
