import { SharePermission } from '../constants/enums';

/**
 * Share information for a note
 */
export class ShareInfo {
    public id!: string;
    public noteId!: string;
    public sharedWithUserId!: string;
    public permission!: SharePermission;
    public sharedByUserId!: string;
    public createdAt!: Date;
}

/**
 * Data Transfer Object for sharing a note
 */
export class ShareNoteDTO {
    public userId?: string;
    public username?: string;
    public permission!: SharePermission;
}

/**
 * Response model for share note
 */
export class ShareNoteResponse {
    public message!: string;
    public share?: ShareInfo;
}

/**
 * Response model for unshare note
 */
export class UnshareNoteResponse {
    public message!: string;
}

/**
 * Response model for shared notes list
 */
export class SharedNotesResponse {
    public notes!: any[];
}

/**
 * Share user information
 */
export class ShareUserInfo {
    public id!: string;
    public userId!: string;
    public username?: string;
    public permission!: SharePermission;
    public createdAt!: Date;
}

/**
 * Response model for note shares list
 */
export class NoteSharesResponse {
    public shares!: ShareUserInfo[];
}
