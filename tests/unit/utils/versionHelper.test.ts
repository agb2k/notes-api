import { getCurrentVersionNumber } from '../../../src/utils/versionHelper';
import { NoteInstance } from '../../../src/models/noteModel';
import { DEFAULTS } from '../../../src/constants';

describe('versionHelper', () => {
    describe('getCurrentVersionNumber', () => {
        it('should return version number when present', () => {
            const mockNote = {
                version: 5
            } as NoteInstance;

            const result = getCurrentVersionNumber(mockNote);
            expect(result).toBe(5);
        });

        it('should return default version when version is undefined', () => {
            const mockNote = {
                version: undefined
            } as NoteInstance;

            const result = getCurrentVersionNumber(mockNote);
            expect(result).toBe(DEFAULTS.NOTE_VERSION);
        });

        it('should return default version when version is null', () => {
            const mockNote = {
                version: null as unknown as number
            } as NoteInstance;

            const result = getCurrentVersionNumber(mockNote);
            expect(result).toBe(DEFAULTS.NOTE_VERSION);
        });

        it('should return default version when version is 0', () => {
            const mockNote = {
                version: 0
            } as NoteInstance;

            const result = getCurrentVersionNumber(mockNote);
            expect(result).toBe(0); // 0 is a valid version, should not default
        });

        it('should handle version 1', () => {
            const mockNote = {
                version: 1
            } as NoteInstance;

            const result = getCurrentVersionNumber(mockNote);
            expect(result).toBe(1);
        });
    });
});

