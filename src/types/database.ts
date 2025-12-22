import { Sequelize, Model } from 'sequelize';
import { UserInstance } from '../models/userModel';
import { NoteInstance } from '../models/noteModel';
import { NoteVersionInstance } from '../models/noteVersionModel';
import { NoteShareInstance } from '../models/noteShareModel';
import { NoteAttachmentInstance } from '../models/noteAttachmentModel';

/**
 * Interface for database models collection
 */
export interface DatabaseModels {
    Sequelize: typeof Sequelize;
    sequelize: Sequelize;
    users: typeof Model & (new () => UserInstance);
    notes: typeof Model & (new () => NoteInstance);
    noteVersions: typeof Model & (new () => NoteVersionInstance);
    noteShares: typeof Model & (new () => NoteShareInstance);
    noteAttachments: typeof Model & (new () => NoteAttachmentInstance);
}

/**
 * Type for model association function
 */
export type AssociateFunction = (models: DatabaseModels) => void;

/**
 * Extended model type with associate method
 */
export interface ModelWithAssociate extends Model {
    associate?: AssociateFunction;
}

