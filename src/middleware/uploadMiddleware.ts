import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { ValidationError } from '../utils/errors';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        cb(null, 'uploads/');
    },
    filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${path.extname(file.originalname)}`;
        cb(null, `${file.fieldname}-${uniqueSuffix}`);
    }
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new ValidationError('Only image and video files are allowed'));
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
    }
});

export const uploadSingle = upload.single('file');

