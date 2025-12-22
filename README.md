# Notes API

## 1. What This Project Is

A **Note-Taking REST API** built with TypeScript, Express.js, MySQL, and Redis. 

Features include:
- **Version Control**: Track all changes to notes over time with the ability to revert to previous versions
- **Concurrency Handling**: Prevents conflicts when multiple users attempt to update the same note simultaneously
- **Full-Text Search**: Efficient keyword-based search across all notes
- **Soft Deletion**: Preserves note history even after deletion
- **Caching**: Redis-based caching for improved performance
- **Authentication**: Secure JWT-based authentication with refresh tokens
- **Note Sharing**: Share notes with other users with granular permissions
- **File Attachments**: Support for multimedia file attachments

The project includes a frontend application along with OpenAPI auto generated API documentation as well 

---

## 2. Features

### Application Functionality

**Versioning System**
- Tracks all changes to notes over time
- Each note update creates a new version record in the `note_versions` table before modification
- Users can retrieve all versions of a note and revert to any previous version
- Version history is preserved even after note updates or deletions

**Concurrency Handling**
- Optimistic locking mechanism to prevent concurrent updates
- Uses version field with database transactions to ensure atomicity
- Returns 409 Conflict status when concurrent modifications are detected
- Clients can handle conflicts and retry with the latest version

**Full-Text Search**
- MySQL FULLTEXT index on the `content` column
- Supports natural language search mode for better relevance ranking
- SQL injection prevention using Sequelize.escape()
- Search results are cached in Redis for 30 minutes with automatic invalidation

### Database

**ORM Usage (Sequelize)**
- All database interactions use Sequelize ORM
- Model definitions with relationships and associations
- Database migrations for schema management

**Database Schema**
- **Users Table**: Stores user accounts with secure password hashing
- **Notes Table**: Main notes table with version field, soft deletion support, and FULLTEXT index
- **Note Versions Table**: Tracks all historical versions of notes
- **Note Shares Table**: Manages note sharing relationships with permissions
- **Note Attachments Table**: Stores metadata for file attachments
- Indices on userId, version, deletedAt, and FULLTEXT on content
- Foreign key relationships maintain data integrity
- Soft deletion implemented using `deletedAt` timestamp

### API Endpoints

**User Registration** (`POST /api/users/register`)
- Creates new user accounts with secure password hashing using bcrypt (10 rounds)
- Validates input data and prevents duplicate usernames/emails

**User Login** (`POST /api/users/login`)
- Authenticates users and returns JWT access token and refresh token

**Create Note** (`POST /api/notes`)
- Allows authenticated users to create notes with versioning support
- Automatically creates initial version (version 1)
- Supports categories (Work, Personal, Education)

**Retrieve All Notes** (`GET /api/notes`)
- Fetches all notes associated with the authenticated user (owned + shared)
- Results cached in Redis for 1 hour

**Retrieve Notes by Keywords** (`GET /api/notes/search?keywords=...`)
- Full-text search functionality using MySQL FULLTEXT
- Results cached in Redis for 30 minutes

**Retrieve Specific Note** (`GET /api/notes/:noteId`)
- Fetches a single note by ID with proper authorization checks
- Results cached in Redis for 1 hour

**Update Note** (`PUT /api/notes/:noteId`)
- Updates note with optimistic locking support
- Requires `expectedVersion` in request body
- Creates new version before update
- Returns 409 Conflict if version mismatch detected

**Delete Note** (`DELETE /api/notes/:noteId`)
- Soft deletes note by setting `deletedAt` timestamp
- Preserves version history
- Invalidates related cache entries

### Caching

**Redis Caching**
- Cache keys:
  - `notes:{userId}` - User's notes list (1 hour TTL)
  - `note:{noteId}` - Individual note (1 hour TTL)
  - `notes:search:{userId}:{keywords}` - Search results (30 min TTL)
  - `refreshToken:{userId}:{tokenId}` - Refresh tokens (7 days TTL)

**Cache Invalidation**
- Automatic cache invalidation on note create/update/delete
- Invalidates user notes list, individual note cache, and all search cache entries
- Uses Redis SCAN to find and delete all search keys for a user
- Refresh tokens revoked on logout

### Additional Features

**Docker & Docker Compose**
- Containerization with Docker
- Docker Compose configuration for all services (API, MySQL, Redis, Frontend, phpMyAdmin, Redis Commander)
- Health checks for database and Redis services
- Automatic migrations on container startup

**Singleton Pattern**
- Redis client implemented as singleton to ensure single connection instance
- Connection state monitoring and health checks

**Documentation**
- README with setup instructions
- API documentation via Swagger/OpenAPI at `/api-docs`

---

## 3. Bonus Features

### Note Sharing

- Note sharing system with granular permissions
- Users can share notes with other users with either "read" or "edit" permissions
- Shared notes appear in the recipient's note list
- Permission management allows updating or removing shares

Endpoints:
- `POST /api/notes/:noteId/share` - Share note with user
- `GET /api/notes/:noteId/shares` - Get list of users note is shared with
- `GET /api/notes/shared` - Get all notes shared with authenticated user
- `DELETE /api/notes/:noteId/share/:userId` - Remove share

### Multimedia Attachments

- File upload system supporting images, videos, and documents
- Files stored in `uploads/` directory with unique naming
- Metadata stored in database with file type, size, and path
- Secure file download with proper authorization checks

Endpoints:
- `POST /api/notes/:noteId/attachments` - Upload attachment (multipart/form-data)
- `GET /api/notes/:noteId/attachments` - Get all attachments for note
- `GET /api/attachments/:attachmentId/download` - Download attachment file
- `DELETE /api/attachments/:attachmentId` - Delete attachment

### Refresh Token Mechanism

- Secure session management with refresh tokens
- Short-lived access tokens (15 minutes) for security
- Long-lived refresh tokens (7 days) stored in Redis
- Token rotation on refresh

Endpoints:
- `POST /api/auth/refresh` - Refresh access token using refresh token
- `POST /api/auth/logout` - Logout and revoke refresh token

---

## 4. Additional Features Added

### Frontend Application

A complete frontend application built with vanilla HTML, CSS, and JavaScript.

### API Documentation (Swagger/OpenAPI)

- Interactive API documentation at `/api-docs`
- Auto-generated from TypeScript controllers using TSOA
- Complete endpoint descriptions, request/response schemas, and examples
- Try-it-out functionality for testing endpoints


### Testing

- **Unit Tests**: Test utilities, factories, and cache operations with mocked dependencies
- **Integration Tests**: API endpoint testing including CRUD, search, versioning, and concurrency scenarios
- Test coverage reporting available

### Development Tools

- **phpMyAdmin**: Database management interface at `http://localhost:8081`
- **Redis Commander**: Redis management interface at `http://localhost:8083`
- **Automatic Migrations**: Database migrations run automatically on container startup
- **Auto JWT Secret**: JWT secret auto-generates if not provided (with warning in production)

---

## 5. How to Get Up and Started with Docker Compose

### Prerequisites

- Docker Desktop installed and running
- Ports 3000, 3306, 6379, 8080, 8081, 8083 available

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd notes-api
   ```

2. **Start all services with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

3. **Wait for services to be ready:**
   - Wait for all services to start
   - The API will automatically run database migrations
   - You'll see "Server is running on port 8080" when ready

4. **Access the application:**
   - **API**: http://localhost:8080
   - **API Documentation**: http://localhost:8080/api-docs
   - **Frontend**: http://localhost:3000
   - **phpMyAdmin**: http://localhost:8081 (username: `root`, password: `test123`)
   - **Redis Commander**: http://localhost:8083

### Configuration (Optional)

The application works out of the box with default settings. To customize, create a `.env` file in the project root:

```env
# Database Configuration
DB_PASSWORD=your_secure_password
DB_NAME=notes_db

# Redis Configuration (defaults work with Docker Compose)
REDIS_HOST=redis
REDIS_PORT=6379

# API Configuration
PORT=8080
JWT_SECRET=your_jwt_secret_key  # Optional - auto-generates if not set
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
```

### Stopping the Application

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clears database and uploads)
docker-compose down -v
```

---

## 6. How to Use

### Using the Frontend (Recommended)

1. **Access the frontend** at http://localhost:3000

2. **Register a new account:**
   - Click "Register" or "Don't have an account? Register"
   - Enter username, email, and password
   - Click "Register"

3. **Login:**
   - Enter your username and password
   - Click "Login"
   - You'll be automatically redirected to the notes dashboard

4. **Create a note:**
   - Click "Create New Note"
   - Enter title and content
   - Select a category (optional)
   - Click "Save Note"

5. **Search notes:**
   - Use the search bar at the top
   - Enter keywords to search across all your notes

6. **View note versions:**
   - Open any note
   - Click "View Versions" to see all historical versions
   - Click "Revert" on any version to restore it

7. **Share a note:**
   - Open a note
   - Click "Share Note"
   - Enter the username of the user to share with
   - Select permission (Read or Edit)
   - Click "Share"

8. **Upload attachments:**
   - Open a note
   - Click "Upload Attachment"
   - Select a file (image, video, or document)
   - File will be attached to the note

### Using API Documentation

1. Navigate to http://localhost:8080/api-docs
2. Browse available endpoints organized by tags
3. Click on any endpoint to see detailed documentation
4. Use "Try it out" to test endpoints directly from the browser
5. Authorize using the "Authorize" button with your access token

---

## 7. Endpoints and What They Do

The API provides the following endpoint categories:

- **Authentication**: User registration and login (`/api/users/register`, `/api/users/login`)
- **Note Management**: CRUD operations for notes (`/api/notes`)
- **Search**: Full-text search across notes (`/api/notes/search`)
- **Version Management**: View and revert to note versions (`/api/notes/:noteId/versions`, `/api/notes/:noteId/revert/:versionNumber`)
- **Note Sharing**: Share notes with other users and manage permissions (`/api/notes/:noteId/share`, `/api/notes/:noteId/shares`, `/api/notes/shared`)
- **Attachments**: Upload, download, and manage file attachments (`/api/notes/:noteId/attachments`, `/api/attachments/:attachmentId/download`)
- **Token Management**: Refresh access tokens and logout (`/api/auth/refresh`, `/api/auth/logout`)
- **Health Check**: Service health monitoring (`/health`)

**For complete API documentation including request/response schemas, authentication requirements, and status codes, please refer to the interactive Swagger documentation:**

**[API Documentation (Swagger)](http://localhost:8080/api-docs)**

The Swagger documentation provides:
- Complete endpoint descriptions
- Request/response schemas with examples
- Authentication requirements
- Status codes and error responses
- Interactive "Try it out" functionality
- Authorization support for testing protected endpoints

---

## 8. Technical Details

### Architecture

The application follows a three-tier layered architecture:

- **Presentation Layer (Controllers)**: Handles HTTP requests, input validation, and response formatting
- **Business Logic Layer (Services)**: Contains all business rules and orchestrates data operations
- **Data Access Layer (Models)**: Manages database interactions through Sequelize ORM

**Technology Stack:**
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with TSOA for automatic OpenAPI documentation generation
- **Database**: MySQL 8.0 with Sequelize ORM
- **Cache**: Redis for in-memory caching with TTL-based expiration
- **Containerization**: Docker and Docker Compose

### Design Decisions

**Concurrency Handling**: Optimistic locking using version field with database transactions. Clients must handle 409 Conflict responses and retry logic. For high contention scenarios, distributed locking or event sourcing could be alternatives.

**Full-Text Search**: MySQL FULLTEXT index instead of Elasticsearch. No additional infrastructure required, but less flexible than dedicated search engines. Performance degrades with very large datasets (10M+ records).

**Caching Strategy**: Redis caching with TTL-based expiration and pattern-based invalidation. Cache keys: user notes lists (1 hour TTL), individual notes (1 hour TTL), search results (30 min TTL). Invalidation happens immediately on create/update/delete operations. Cache hits are < 1ms vs 10-50ms database queries, with potential for stale data (acceptable for this use case).

**Authentication**: JWT access tokens (15 minutes) + refresh tokens (7 days) stored in Redis. Stateless access tokens enable horizontal scaling. Refresh tokens stored in Redis allow revocation on logout. Access tokens cannot be revoked before expiration.

**File Storage**: Local file storage in `uploads/` directory. Simple implementation with no additional services, but not scalable across multiple servers. Future migration path: S3 or similar object storage.

**Frontend**: Vanilla JavaScript instead of framework. Simple for this backend-heavy project, but requires more manual DOM manipulation.

### Scalability and Performance

**Identified Limitations:**
- MySQL FULLTEXT search performance degrades with very large datasets
- Optimistic locking may cause frequent conflicts under high contention
- Single Redis instance (no horizontal scaling)
- Local file storage incompatible with multi-server deployments

**Scaling Strategies:**
- Horizontal scaling: load balancer, Redis cluster, database read replicas
- Vertical scaling: increased connection pool, Redis memory, CPU/memory resources
- Infrastructure: migrate to object storage (S3), implement Redis tags for cache management
- Alternative architectures: microservices, event-driven architecture, CQRS pattern

**Performance Optimizations:**
- Redis caching with appropriate TTLs for frequently accessed data
- Database indices on frequently queried columns (userId, version, deletedAt, FULLTEXT on content)
- Connection pooling (max 5 connections)
- Transaction management for atomic operations

**Security Measures:**
- JWT authentication with short-lived access tokens
- Password hashing with bcrypt (10 rounds)
- SQL injection prevention via Sequelize parameterized queries
- Input validation with express-validator


## Testing

```bash
# Run all tests
npm test
```

**Test Structure:**
- **Unit Tests**: `tests/unit/` - Utilities, factories, cache operations (mocked)
- **Integration Tests**: `tests/integration/` - API endpoints, CRUD, search, versioning, concurrency

## Environment Variables

Optional `.env` file (JWT_SECRET auto-generates if not set):

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=notes_db
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=8080
JWT_SECRET=your_secret_key  # Optional
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
```
