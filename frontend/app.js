/**
 * Frontend Application for Notes API
 * Handles authentication, note CRUD operations, version management, and search
 */

// ==================== Constants ====================
const API_BASE_URL = 'http://localhost:8080/api';
const STORAGE_KEY_ACCESS_TOKEN = 'accessToken';
const STORAGE_KEY_REFRESH_TOKEN = 'refreshToken';
const HTTP_STATUS_UNAUTHORIZED = 401;

// ==================== State Management ====================
let authToken = localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
let refreshToken = localStorage.getItem(STORAGE_KEY_REFRESH_TOKEN);
let currentNoteId = null;
let currentVersion = null; // For optimistic locking
let isRefreshing = false; // Prevent multiple simultaneous refresh attempts
let refreshPromise = null; // Store the refresh promise
let selectedFile = null; // For file uploads

// ==================== Initialization ====================
/**
 * Initialize the application on page load
 * Checks for existing auth token and shows appropriate section
 */
document.addEventListener('DOMContentLoaded', () => {
    if (authToken) {
        showNotesSection();
        loadNotes();
    } else {
        showAuthSection();
    }
});

// ==================== Authentication Functions ====================
/**
 * Shows the login form and hides the register form
 */
function showLogin() {
    document.getElementById('login-form').style.display = 'flex';
    document.getElementById('register-form').style.display = 'none';
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    document.querySelectorAll('.tab-btn')[1].classList.remove('active');
    clearErrors();
}

/**
 * Shows the register form and hides the login form
 */
function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'flex';
    document.querySelectorAll('.tab-btn')[0].classList.remove('active');
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
    clearErrors();
}

/**
 * Clears all error messages from auth forms
 */
function clearErrors() {
    document.getElementById('auth-error').textContent = '';
    document.getElementById('register-error').textContent = '';
}

/**
 * Authenticates a user with username and password
 * Stores JWT token in localStorage on success
 */
async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('auth-error');

    if (!username || !password) {
        errorEl.textContent = 'Please fill in all fields';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.accessToken;
            refreshToken = data.refreshToken;
            localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, authToken);
            localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, refreshToken);
            showNotesSection();
            loadNotes();
        } else {
            errorEl.textContent = data.error?.message || 'Login failed';
        }
    } catch (error) {
        errorEl.textContent = 'Network error. Make sure the API is running.';
        console.error('Login error:', error);
    }
}

/**
 * Registers a new user account
 * Switches to login form on success
 */
async function register() {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const errorEl = document.getElementById('register-error');

    if (!username || !password) {
        errorEl.textContent = 'Please fill in all fields';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            errorEl.textContent = 'Registration successful! Please login.';
            setTimeout(() => {
                showLogin();
                document.getElementById('login-username').value = username;
            }, 1000);
        } else {
            errorEl.textContent = data.error?.message || 'Registration failed';
        }
    } catch (error) {
        errorEl.textContent = 'Network error. Make sure the API is running.';
        console.error('Register error:', error);
    }
}

/**
 * Logs out the current user
 * Revokes refresh token on server and clears local storage
 */
async function logout() {
    // Try to revoke refresh token on server
    if (refreshToken) {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });
        } catch (error) {
            // Ignore errors - we'll clear local storage anyway
            console.error('Logout error:', error);
        }
    }

    // Clear local storage
    authToken = null;
    refreshToken = null;
    localStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN);
    showAuthSection();
    clearNotes();
}

/**
 * Shows the authentication section and hides notes section
 */
function showAuthSection() {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('notes-section').style.display = 'none';
}

/**
 * Shows the notes section and hides authentication section
 */
function showNotesSection() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('notes-section').style.display = 'block';
}

// ==================== Notes Functions ====================
/**
 * Loads all notes for the authenticated user
 * Displays loading state and handles errors
 */
async function loadNotes() {
    const notesList = document.getElementById('notes-list');
    notesList.innerHTML = '<div class="loading">Loading notes...</div>';

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/notes`);

        if (response.status === HTTP_STATUS_UNAUTHORIZED) {
            return; // authenticatedFetch already handled logout
        }

        const data = await response.json();
        const allNotes = data.notes || [];

        displayNotes(allNotes);
    } catch (error) {
        notesList.innerHTML = '<div class="error">Error loading notes. Make sure the API is running.</div>';
        console.error('Load notes error:', error);
    }
}

/**
 * Displays all notes in a single list
 * @param {Array} notes - Array of note objects
 */
function displayNotes(notes) {
    const notesList = document.getElementById('notes-list');

    if (notes.length === 0) {
        notesList.innerHTML = `
            <div class="empty-state">
                <p>No notes yet. Create your first note above!</p>
            </div>
        `;
    } else {
        notesList.innerHTML = notes.map(note => {
            const shareButton = `<button class="btn-share" onclick="showShareModal('${note.id}')">Share</button>`;
            const editButton = `<button class="btn-edit" onclick="editNote('${note.id}')">Edit</button>`;
            const deleteButton = `<button class="btn-delete" onclick="deleteNote('${note.id}')">Delete</button>`;
            
            return `
            <div class="note-card">
                <div class="note-header">
                    <div>
                        ${note.category ? `<span class="note-category">${note.category}</span>` : ''}
                    </div>
                    <div class="note-actions">
                        ${shareButton}
                        <button class="btn-versions" onclick="showVersions('${note.id}')">Versions</button>
                        ${editButton}
                        ${deleteButton}
                    </div>
                </div>
                <div class="note-content">${escapeHtml(note.content)}</div>
                <div id="attachments-${note.id}" class="note-attachments"></div>
                <div class="note-meta">
                    <span>Version: ${note.version || 1}</span>
                    <span>Created: ${formatDate(note.createdAt)}</span>
                </div>
            </div>
            `;
        }).join('');
    }
    
    // Load attachments for each note
    notes.forEach(note => {
        loadAttachments(note.id);
    });
}

/**
 * Creates a new note or updates an existing one
 * Uses optimistic locking if updating (sends expectedVersion)
 */
async function saveNote() {
    const content = document.getElementById('note-content').value;
    const category = document.getElementById('note-category').value;

    if (!content.trim()) {
        alert('Please enter note content');
        return;
    }

    const url = currentNoteId 
        ? `${API_BASE_URL}/notes/${currentNoteId}`
        : `${API_BASE_URL}/notes`;

    const body = currentNoteId
        ? { 
            content, 
            category: category || null, 
            ...(currentVersion !== null && currentVersion !== undefined ? { expectedVersion: currentVersion } : {})
          }
        : { content, category: category || null };

    try {
        const response = await authenticatedFetch(url, {
            method: currentNoteId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (response.status === HTTP_STATUS_UNAUTHORIZED) {
            return; // authenticatedFetch already handled logout
        }

        if (!response.ok) {
            let errorMessage = 'Failed to save note';
            try {
                const data = await response.json();
                errorMessage = data.error?.message || data.message || errorMessage;
            } catch (e) {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            alert(errorMessage);
            if (errorMessage.includes('Concurrent modification')) {
                loadNotes();
            }
            return;
        }

        const data = await response.json();
        resetForm();
        loadNotes();
    } catch (error) {
        alert(`Error saving note: ${error.message}. Make sure the API is running.`);
        console.error('Save note error:', error);
    }
}

/**
 * Loads a note for editing
 * Populates the form with note data and sets edit mode
 * @param {string} noteId - The ID of the note to edit
 */
async function editNote(noteId) {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/notes/${noteId}`);

        if (response.status === HTTP_STATUS_UNAUTHORIZED) {
            return; // authenticatedFetch already handled logout
        }

        if (!response.ok) {
            let errorMessage = 'Failed to load note';
            try {
                const data = await response.json();
                errorMessage = data.error?.message || data.message || errorMessage;
            } catch (e) {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            alert(errorMessage);
            return;
        }

        const data = await response.json();
        const note = data.note;
        currentNoteId = note.id;
        currentVersion = note.version || 1;
        document.getElementById('note-content').value = note.content;
        document.getElementById('note-category').value = note.category || '';
        document.getElementById('form-title').textContent = 'Edit Note';
        document.getElementById('save-btn').textContent = 'Update Note';
        document.getElementById('cancel-btn').style.display = 'block';
        document.getElementById('note-content').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        alert('Error loading note');
        console.error('Edit note error:', error);
    }
}

/**
 * Cancels the current edit operation and resets the form
 */
function cancelEdit() {
    resetForm();
}

/**
 * Resets the note form to its initial state
 * Clears current note ID and version
 */
function resetForm() {
    currentNoteId = null;
    currentVersion = null;
    selectedFile = null;
    document.getElementById('note-content').value = '';
    document.getElementById('note-category').value = '';
    document.getElementById('file-input').value = '';
    document.getElementById('file-preview').innerHTML = '';
    document.getElementById('form-title').textContent = 'Create New Note';
    document.getElementById('save-btn').textContent = 'Create Note';
    document.getElementById('cancel-btn').style.display = 'none';
}

/**
 * Soft deletes a note after user confirmation
 * @param {string} noteId - The ID of the note to delete
 */
async function deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note?')) {
        return;
    }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/notes/${noteId}`, {
            method: 'DELETE'
        });

        if (response.status === HTTP_STATUS_UNAUTHORIZED) {
            return; // authenticatedFetch already handled logout
        }

        if (response.ok) {
            loadNotes();
        } else {
            const data = await response.json();
            alert(data.error?.message || 'Failed to delete note');
        }
    } catch (error) {
        alert('Error deleting note');
        console.error('Delete note error:', error);
    }
}

/**
 * Searches notes by keywords using full-text search
 * Uses the search endpoint with keywords query parameter
 */
async function searchNotes() {
    const keywords = document.getElementById('search-input').value.trim();
    const notesList = document.getElementById('notes-list');

    if (!keywords) {
        loadNotes();
        return;
    }

    notesList.innerHTML = '<div class="loading">Searching...</div>';

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/notes/search?keywords=${encodeURIComponent(keywords)}`);

        if (response.status === HTTP_STATUS_UNAUTHORIZED) {
            return; // authenticatedFetch already handled logout
        }

        const data = await response.json();
        const allNotes = data.notes || [];
        
        displayNotes(allNotes);
    } catch (error) {
        notesList.innerHTML = '<div class="error">Error searching notes</div>';
        console.error('Search error:', error);
    }
}

/**
 * Clears the search input and reloads all notes
 */
function clearSearch() {
    document.getElementById('search-input').value = '';
    loadNotes();
}

/**
 * Loads and displays version history for a note
 * @param {string} noteId - The ID of the note
 */
async function showVersions(noteId) {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/notes/${noteId}/versions`);

        if (response.status === HTTP_STATUS_UNAUTHORIZED) {
            return; // authenticatedFetch already handled logout
        }

        const data = await response.json();
        displayVersionsModal(noteId, data.versions || []);
    } catch (error) {
        alert('Error loading versions');
        console.error('Versions error:', error);
    }
}

/**
 * Displays a modal with version history
 * @param {string} noteId - The ID of the note
 * @param {Array} versions - Array of version objects
 */
function displayVersionsModal(noteId, versions) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'versions-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Note Versions</h2>
                <button class="close-btn" onclick="closeVersionsModal()">&times;</button>
            </div>
            <div id="versions-list">
                ${versions.map(v => `
                    <div class="version-item">
                        <div class="version-header">
                            <span class="version-number">Version ${v.versionNumber}</span>
                            <span>${formatDate(v.createdAt)}</span>
                        </div>
                        <div class="version-content">${escapeHtml(v.content)}</div>
                        ${v.category ? `<div style="margin-top: 8px;"><span class="note-category">${v.category}</span></div>` : ''}
                        <div style="margin-top: 12px;">
                            <button class="btn-revert" onclick="revertToVersion('${noteId}', ${v.versionNumber})">
                                Revert to this version
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

/**
 * Reverts a note to a specific version
 * @param {string} noteId - The ID of the note
 * @param {number} versionNumber - The version number to revert to
 */
async function revertToVersion(noteId, versionNumber) {
    if (!confirm(`Are you sure you want to revert this note to version ${versionNumber}? The current version will be saved before reverting.`)) {
        return;
    }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/notes/${noteId}/revert/${versionNumber}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.status === HTTP_STATUS_UNAUTHORIZED) {
            return; // authenticatedFetch already handled logout
        }

        if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData?.error?.message || errorData?.message || 'Error reverting note';
            alert(errorMessage);
            console.error('Revert error:', errorData);
            return;
        }

        const data = await response.json();
        
        // Close the versions modal
        closeVersionsModal();
        
        // Reload notes to show the reverted version
        await loadNotes();
        
        // Show success message
        alert(`Note successfully reverted to version ${versionNumber}`);
    } catch (error) {
        alert('Error reverting note. Please try again.');
        console.error('Revert error:', error);
    }
}

/**
 * Closes the versions modal
 */
function closeVersionsModal() {
    const modal = document.getElementById('versions-modal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Clears the notes list and resets the form
 */
function clearNotes() {
    document.getElementById('notes-list').innerHTML = '';
    resetForm();
}

// ==================== Token Management ====================
/**
 * Refreshes the access token using the refresh token
 * @returns {Promise<string|null>} New access token or null if refresh failed
 */
async function refreshAccessToken() {
    // If already refreshing, return the existing promise
    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }

    if (!refreshToken) {
        return null;
    }

    isRefreshing = true;
    refreshPromise = (async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) {
                // Refresh failed - user needs to login again
                await logout();
                return null;
            }

            const data = await response.json();
            authToken = data.accessToken;
            localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, authToken);
            return authToken;
        } catch (error) {
            console.error('Token refresh error:', error);
            await logout();
            return null;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

/**
 * Makes an authenticated API request with automatic token refresh
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Response>} The fetch response
 */
async function authenticatedFetch(url, options = {}) {
    // Ensure we have an access token
    if (!authToken) {
        // Try to refresh
        const newToken = await refreshAccessToken();
        if (!newToken) {
            throw new Error('Authentication required');
        }
    }

    // Add authorization header
    // Don't set Content-Type for FormData - browser needs to set it with boundary
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${authToken}`
    };
    
    // If body is FormData, remove Content-Type to let browser set it
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }

    // Make the request
    let response = await fetch(url, { ...options, headers });

    // If unauthorized, try refreshing token once
    if (response.status === HTTP_STATUS_UNAUTHORIZED && refreshToken) {
        const newToken = await refreshAccessToken();
        if (newToken) {
            // Retry the request with new token
            headers['Authorization'] = `Bearer ${newToken}`;
            response = await fetch(url, { ...options, headers });
        } else {
            // Refresh failed - logout
            await logout();
            throw new Error('Session expired. Please login again.');
        }
    }

    return response;
}

// ==================== Utility Functions ====================

/**
 * Escapes HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML string
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Formats a date string to a localized date/time string
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string or 'N/A' if invalid
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
}

// ==================== File Upload Functions ====================
/**
 * Initializes file upload functionality
 */
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
});

/**
 * Handles file selection for upload
 */
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        alert('File size must be less than 5MB');
        event.target.value = '';
        return;
    }

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        alert('Only image and video files are allowed');
        event.target.value = '';
        return;
    }

    selectedFile = file;
    displayFilePreview(file);
}

/**
 * Displays a preview of the selected file
 */
function displayFilePreview(file) {
    const preview = document.getElementById('file-preview');
    preview.innerHTML = `
        <div class="file-preview-item">
            <span>📎 ${escapeHtml(file.name)} (${formatFileSize(file.size)})</span>
            <button onclick="clearFileSelection()" class="btn-remove-file">×</button>
        </div>
    `;
}

/**
 * Clears the selected file
 */
function clearFileSelection() {
    selectedFile = null;
    document.getElementById('file-input').value = '';
    document.getElementById('file-preview').innerHTML = '';
}

/**
 * Formats file size for display
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Uploads a file attachment for a note
 */
async function uploadAttachment(noteId, file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/notes/${noteId}/attachments`, {
            method: 'POST',
            headers: {
                // Don't set Content-Type - let browser set it with boundary for FormData
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || errorData.message || 'Failed to upload attachment');
        }

        // Reload attachments
        await loadAttachments(noteId);
        return true;
    } catch (error) {
        alert(`Error uploading file: ${error.message}`);
        return false;
    }
}

/**
 * Loads attachments for a note
 */
async function loadAttachments(noteId) {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/notes/${noteId}/attachments`);
        
        if (!response.ok) {
            return; // Note might not exist or user doesn't have access
        }

        const data = await response.json();
        const attachmentsContainer = document.getElementById(`attachments-${noteId}`);
        if (!attachmentsContainer) return;

        if (data.attachments && data.attachments.length > 0) {
            attachmentsContainer.innerHTML = `
                <div class="attachments-list">
                    <strong>Attachments:</strong>
                    ${data.attachments.map(att => `
                        <div class="attachment-item">
                            <span>📎 ${escapeHtml(att.fileName)} (${formatFileSize(att.fileSize)})</span>
                            <div class="attachment-actions">
                                <button onclick="downloadAttachment('${att.id}')" class="btn-download">Download</button>
                                <button onclick="deleteAttachment('${att.id}', '${noteId}')" class="btn-delete-attachment">Delete</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            attachmentsContainer.innerHTML = '';
        }
    } catch (error) {
        console.error('Error loading attachments:', error);
    }
}

/**
 * Downloads an attachment
 */
async function downloadAttachment(attachmentId) {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/attachments/${attachmentId}/download`);
        
        if (!response.ok) {
            throw new Error('Failed to download attachment');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Get filename from Content-Disposition header or use attachment ID
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition 
            ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
            : `attachment-${attachmentId}`;
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        alert(`Error downloading attachment: ${error.message}`);
    }
}

/**
 * Deletes an attachment
 */
async function deleteAttachment(attachmentId, noteId) {
    if (!confirm('Are you sure you want to delete this attachment?')) {
        return;
    }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/attachments/${attachmentId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to delete attachment');
        }

        // Reload attachments
        await loadAttachments(noteId);
    } catch (error) {
        alert(`Error deleting attachment: ${error.message}`);
    }
}

// ==================== Note Sharing Functions ====================
/**
 * Shows the share modal for a note
 */
async function showShareModal(noteId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'share-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Share Note</h2>
                <button class="close-btn" onclick="closeShareModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="share-form">
                    <label for="share-username">Username:</label>
                    <input type="text" id="share-username" placeholder="Enter username to share with">
                    <label for="share-permission">Permission:</label>
                    <select id="share-permission">
                        <option value="read">Read Only</option>
                        <option value="edit">Can Edit</option>
                    </select>
                    <button onclick="shareNote('${noteId}')" class="btn-share-submit">Share</button>
                </div>
                <div id="current-shares">
                    <h3>Currently Shared With:</h3>
                    <div id="shares-list">Loading...</div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';

    // Load current shares
    await loadNoteShares(noteId);
}

/**
 * Closes the share modal
 */
function closeShareModal() {
    const modal = document.getElementById('share-modal');
    if (modal) {
        modal.remove();
    }
}


/**
 * Shares a note with a user
 */
async function shareNote(noteId) {
    const username = document.getElementById('share-username').value.trim();
    const permission = document.getElementById('share-permission').value;

    if (!username) {
        alert('Please enter a username');
        return;
    }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/notes/${noteId}/share`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, permission })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to share note');
        }

        // Clear input and reload
        document.getElementById('share-username').value = '';
        await loadNoteShares(noteId);
        await loadNotes();
        alert('Note shared successfully');
    } catch (error) {
        alert(`Error sharing note: ${error.message}`);
    }
}

/**
 * Unshares a note with a user
 */
async function unshareNote(noteId, userId) {
    if (!confirm('Are you sure you want to unshare this note?')) {
        return;
    }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/notes/${noteId}/share/${userId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to unshare note');
        }

        // Reload shares and notes
        await loadNoteShares(noteId);
        await loadNotes();
    } catch (error) {
        alert(`Error unsharing note: ${error.message}`);
    }
}

/**
 * Loads the list of users a note is shared with
 */
async function loadNoteShares(noteId) {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/notes/${noteId}/shares`);
        
        if (!response.ok) {
            document.getElementById('shares-list').innerHTML = '<p>Error loading shares</p>';
            return;
        }

        const data = await response.json();
        const sharesList = document.getElementById('shares-list');
        
        if (data.shares && data.shares.length > 0) {
            sharesList.innerHTML = data.shares.map(share => `
                <div class="share-item">
                    <span>${escapeHtml(share.username || share.userId)} - ${share.permission === 'read' ? 'Read Only' : 'Can Edit'}</span>
                    <button onclick="unshareNote('${noteId}', '${share.userId}')" class="btn-unshare">Unshare</button>
                </div>
            `).join('');
        } else {
            sharesList.innerHTML = '<p>No shares yet</p>';
        }
    } catch (error) {
        console.error('Error loading shares:', error);
        document.getElementById('shares-list').innerHTML = '<p>Error loading shares</p>';
    }
}

/**
 * Updates saveNote to handle file uploads
 */
async function saveNote() {
    const content = document.getElementById('note-content').value;
    const category = document.getElementById('note-category').value;

    if (!content.trim()) {
        alert('Please enter note content');
        return;
    }

    const url = currentNoteId 
        ? `${API_BASE_URL}/notes/${currentNoteId}`
        : `${API_BASE_URL}/notes`;

    const body = currentNoteId
        ? { 
            content, 
            category: category || null, 
            ...(currentVersion !== null && currentVersion !== undefined ? { expectedVersion: currentVersion } : {})
          }
        : { content, category: category || null };

    try {
        const response = await authenticatedFetch(url, {
            method: currentNoteId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (response.status === HTTP_STATUS_UNAUTHORIZED) {
            return; // authenticatedFetch already handled logout
        }

        if (!response.ok) {
            let errorMessage = 'Failed to save note';
            try {
                const data = await response.json();
                errorMessage = data.error?.message || data.message || errorMessage;
            } catch (e) {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            alert(errorMessage);
            if (errorMessage.includes('Concurrent modification')) {
                loadNotes();
            }
            return;
        }

        const data = await response.json();
        const savedNoteId = data.note?.id || currentNoteId;

        // Upload file if selected
        if (selectedFile && savedNoteId) {
            await uploadAttachment(savedNoteId, selectedFile);
            clearFileSelection();
        }

        resetForm();
        loadNotes();
    } catch (error) {
        alert(`Error saving note: ${error.message}. Make sure the API is running.`);
        console.error('Save note error:', error);
    }
}

// ==================== Event Listeners ====================
/**
 * Closes the versions modal when clicking outside of it
 */
document.addEventListener('click', (e) => {
    const modal = document.getElementById('versions-modal');
    if (modal && e.target === modal) {
        closeVersionsModal();
    }
    
    const shareModal = document.getElementById('share-modal');
    if (shareModal && e.target === shareModal) {
        closeShareModal();
    }
});

