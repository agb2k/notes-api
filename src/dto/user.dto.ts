/**
 * Data Transfer Object for user registration
 */
export class RegisterDTO {
    public username!: string;
    public password!: string;
}

/**
 * Data Transfer Object for user login
 */
export class LoginDTO {
    public username!: string;
    public password!: string;
}

/**
 * Response DTO for authentication tokens
 */
export class TokenResponse {
    public accessToken!: string;
    public refreshToken?: string;
}

/**
 * Response model for user registration
 */
export class RegisterResponse {
    public message!: string;
    public userId!: string;
}

/**
 * Response model for user login
 */
export class LoginResponse {
    public message!: string;
    public accessToken!: string;
    public refreshToken!: string;
}
