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

    const payload: RequestUser = { id: saved.id, name: saved.name, email: saved.email, role: saved.role as RequestUser['role'] };
    return { accessToken: this.jwt.sign(payload), user: payload };
  }

  async login(email: string, password: string) {
    const user = await this.users.findOneBy({ email: email.toLowerCase() });
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    const payload: RequestUser = { id: user.id, name: user.name, email: user.email, role: user.role as RequestUser['role'] };
    return { accessToken: this.jwt.sign(payload), user: payload };
  }

  async updateProfile(userId: string, name?: string) {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    if (name?.trim()) user.name = name.trim();
    const saved = await this.users.save(user);
    const payload: RequestUser = { id: saved.id, name: saved.name, email: saved.email, role: saved.role as RequestUser['role'] };
    return { accessToken: this.jwt.sign(payload), user: payload };
  }
}
