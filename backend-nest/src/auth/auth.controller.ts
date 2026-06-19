import { Body, Controller, Get, Param, Patch, Post, UseGuards, ForbiddenException } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import type { RequestUser } from '../common/request-user';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

class RegisterDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.auth.register(body.name, body.email, body.password);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@Body() body: { name?: string; role?: string }, @CurrentUser() user: RequestUser) {
    return this.auth.updateProfile(user.id, body.name, body.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get('members')
  listMembers(@CurrentUser() user: RequestUser) {
    if (user.role === 'Member') throw new ForbiddenException('Access denied');
    return this.auth.listMembers();
  }

  @UseGuards(JwtAuthGuard)
  @Post('members')
  createMember(@Body() body: { name: string; email: string; password: string; role?: string }, @CurrentUser() user: RequestUser) {
    if (user.role === 'Member') throw new ForbiddenException('Access denied');
    return this.auth.createMember(body.name, body.email, body.password, body.role ?? 'Member');
  }

  // Password reset — no auth required
  @Post('forgot-password')
  forgotPassword(@Body() body: { email: string }) {
    return this.auth.forgotPassword(body.email);
  }

  @Post('reset-password')
  resetPassword(@Body() body: { code: string; password: string }) {
    return this.auth.resetPassword(body.code, body.password);
  }

  // PM can reset any member's password directly
  @UseGuards(JwtAuthGuard)
  @Patch('members/:id/password')
  resetMemberPassword(@Param('id') id: string, @Body() body: { password: string }, @CurrentUser() user: RequestUser) {
    if (user.role === 'Member') throw new ForbiddenException('Access denied');
    return this.auth.resetMemberPassword(id, body.password);
  }
}
