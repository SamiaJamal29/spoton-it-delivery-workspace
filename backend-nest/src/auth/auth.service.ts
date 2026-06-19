import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../database/user.entity';
import type { RequestUser } from '../common/request-user';

const PASSWORD_RULES = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async register(name: string, email: string, password: string) {
    if (!name?.trim()) throw new BadRequestException('Name is required');
    if (!PASSWORD_RULES.test(password)) {
      throw new BadRequestException(
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
      );
    }

    const existing = await this.users.findOneBy({ email: email.toLowerCase() });
    if (existing) throw new BadRequestException('An account with this email already exists');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = this.users.create({ name: name.trim(), email: email.toLowerCase(), passwordHash });
    const saved = await this.users.save(user);

    const payload: RequestUser = { id: saved.id, name: saved.name, email: saved.email, role: saved.role  };
    return { accessToken: this.jwt.sign(payload), user: payload };
  }

  async login(email: string, password: string) {
    const user = await this.users.findOneBy({ email: email.toLowerCase() });
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    const payload: RequestUser = { id: user.id, name: user.name, email: user.email, role: user.role  };
    return { accessToken: this.jwt.sign(payload), user: payload };
  }

  async updateProfile(userId: string, name?: string, role?: string) {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    if (name?.trim()) user.name = name.trim();
    if (role?.trim()) user.role = role.trim();
    const saved = await this.users.save(user);
    const payload: RequestUser = { id: saved.id, name: saved.name, email: saved.email, role: saved.role };
    return { accessToken: this.jwt.sign(payload), user: payload };
  }

  async createMember(name: string, email: string, password: string, role: string) {
    if (!name?.trim()) throw new BadRequestException('Name is required');
    if (!email?.trim()) throw new BadRequestException('Email is required');
    if (!password || password.length < 6) throw new BadRequestException('Password must be at least 6 characters');

    const existing = await this.users.findOneBy({ email: email.toLowerCase() });
    if (existing) throw new BadRequestException('An account with this email already exists');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = this.users.create({ name: name.trim(), email: email.toLowerCase(), passwordHash, role: role?.trim() || 'Member' });
    const saved = await this.users.save(user);
    return { id: saved.id, name: saved.name, email: saved.email, role: saved.role, createdAt: saved.createdAt };
  }

  async listMembers() {
    const users = await this.users.find({ order: { createdAt: 'ASC' } });
    return users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt }));
  }

  async forgotPassword(email: string) {
    const user = await this.users.findOneBy({ email: email.toLowerCase() });
    // Always return success message — never reveal whether email exists
    if (!user) return { message: 'If that email exists, a reset code has been sent.', code: null };

    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    user.resetToken = code;
    user.resetTokenExpiry = expiry;
    await this.users.save(user);

    // In production this would be emailed. For dev, we return it directly.
    return { message: 'Reset code generated (dev mode — check the response).', code, expiresIn: '15 minutes' };
  }

  async resetPassword(code: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) throw new BadRequestException('Password must be at least 6 characters');

    const user = await this.users.findOne({ where: { resetToken: code } });
    if (!user || !user.resetTokenExpiry) throw new BadRequestException('Invalid or expired reset code');
    if (new Date() > user.resetTokenExpiry) throw new BadRequestException('Reset code has expired. Please request a new one.');

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await this.users.save(user);
    return { message: 'Password updated successfully. You can now log in.' };
  }

  async resetMemberPassword(targetUserId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) throw new BadRequestException('Password must be at least 6 characters');
    const user = await this.users.findOneBy({ id: targetUserId });
    if (!user) throw new NotFoundException('User not found');
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.users.save(user);
    return { message: `Password updated for ${user.name}` };
  }
}
