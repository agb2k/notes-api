import { Controller, Route, Tags, Post, Body, Response as TsoaResponse } from 'tsoa';

@Route('auth')
@Tags('Auth')
export class TokenController extends Controller {
    /**
     * Refreshes an access token using a valid refresh token
     */
    @Post('refresh')
    @TsoaResponse(200, 'Access token refreshed successfully')
    @TsoaResponse(401, 'Invalid or expired refresh token')
    public async refreshAccessToken(
        @Body() body: { refreshToken: string }
    ): Promise<{ message: string; accessToken: string }> {
        const { AuthService } = await import('../../services/authService');
        const result = await AuthService.refreshAccessToken(body.refreshToken);
        
        return {
            message: 'Token refreshed successfully',
            accessToken: result.accessToken
        };
    }

    /**
     * Logs out a user by revoking their refresh token
     */
    @Post('logout')
    @TsoaResponse(200, 'Logout successful')
    public async logout(
        @Body() body: { refreshToken: string }
    ): Promise<{ message: string }> {
        const { AuthService } = await import('../../services/authService');
        await AuthService.logout(body.refreshToken);
        
        return {
            message: 'Logout successful'
        };
    }
}
