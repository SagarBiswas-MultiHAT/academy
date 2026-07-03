import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn() },
      wallet: { create: jest.fn() },
      referral: { create: jest.fn() },
    };
    jwtService = {
      sign: jest.fn().mockImplementation((_payload, options) => options.expiresIn === '15m' ? 'access-token' : 'refresh-token'),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-secret') } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should throw ConflictException if email exists', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: '1' });
    await expect(service.register({ email: 'test@test.com', password: 'password', name: 'Test' }))
      .rejects.toThrow(ConflictException);
  });

  it('creates wallet and referral tracking during referred registration', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'referrer-1', referralCode: 'REF123' });
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'new@example.com',
      role: 'USER',
    });

    await expect(
      service.register({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
        referralCode: 'REF123',
      }),
    ).resolves.toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-1', email: 'new@example.com', role: 'USER' },
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ referredById: 'referrer-1' }),
    });
    expect(prisma.wallet.create).toHaveBeenCalledWith({ data: { userId: 'user-1' } });
    expect(prisma.referral.create).toHaveBeenCalledWith({
      data: { referrerId: 'referrer-1', referredUserId: 'user-1' },
    });
  });

  it('rejects login with an invalid password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      hashedPassword: await bcrypt.hash('correct-password', 4),
    });

    await expect(service.login({ email: 'user@example.com', password: 'wrong-password' }))
      .rejects.toThrow(UnauthorizedException);
  });

  it('refreshes valid refresh tokens', async () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1' });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'USER',
    });

    await expect(service.refreshTokens('refresh-token')).resolves.toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });
});
