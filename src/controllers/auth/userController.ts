import { Controller, Route, Tags, Post, Body, Response as TsoaResponse } from 'tsoa';
import { UserService } from '../../services/userService';
import { RegisterDTO, LoginDTO, RegisterResponse, LoginResponse } from '../../dto/user.dto';

@Route('users')
@Tags('Users')
export class UserController extends Controller {
    /**
     * Registers a new user account
     */
    @Post('register')
    @TsoaResponse(201, 'User created successfully')
    @TsoaResponse(400, 'Validation error')
    @TsoaResponse(500, 'Server error')
    public async registerUser(
        @Body() body: RegisterDTO
    ): Promise<RegisterResponse> {
        const result = await UserService.registerUser(body);
        
        return {
            message: 'User created successfully',
            userId: result.userId
        };
    }

    /**
     * Authenticates a user and returns both JWT access token and refresh token
     */
    @Post('login')
    @TsoaResponse(200, 'Login successful')
    @TsoaResponse(400, 'Invalid credentials')
    @TsoaResponse(404, 'User not found')
    public async loginUser(
        @Body() body: LoginDTO
    ): Promise<LoginResponse> {
        const tokens = await UserService.loginUser(body);
        
        return {
            message: 'Login successful',
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken!
        };
    }
}
