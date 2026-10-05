import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { generateSecret, generateURI, verify as verifyTotp } from 'otplib';
import * as QRCode from 'qrcode';
import { decryptSecret, encryptSecret } from './crypto.util';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  VerifyResetCodeDto,
  VerifyRegisterOtpDto,
  ResetPasswordDto,
  SocialLoginDto,
} from './dto/auth.dto';

const RESET_CODE_TTL_MINUTES = 10;
const RESET_RESEND_COOLDOWN_MS = 60 * 1000;
const RESET_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  // ─── Đăng ký B1: Gửi mã OTP xác thực email ─────────────
  async sendRegisterOtp(dto: RegisterDto) {
    if (await this.findUserByEmail(dto.email)) {
      throw new ConflictException('Email này đã được sử dụng');
    }

    if (dto.phone && (await this.prisma.user.findUnique({ where: { phone: dto.phone } }))) {
      throw new ConflictException('Số điện thoại này đã được sử dụng');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = await bcrypt.hash(code, 10);

    const payload = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone ?? null,
      passwordHash,
    };

    await this.prisma.$transaction([
      this.prisma.verificationCode.updateMany({
        where: { email: dto.email, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.verificationCode.create({
        data: {
          email: dto.email,
          codeHash,
          payload,
          expiresAt: new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000),
        },
      }),
    ]);

    await this.mailService.sendRegisterCode(
      dto.email,
      `${dto.firstName} ${dto.lastName}`.trim(),
      code,
      RESET_CODE_TTL_MINUTES,
    );

    return {
      success: true,
      message: `Mã OTP xác thực 6 chữ số đã được gửi tới email ${dto.email}. Vui lòng nhập mã để hoàn tất đăng ký.`,
      data: { expiresInMinutes: RESET_CODE_TTL_MINUTES, resendAfterSeconds: RESET_RESEND_COOLDOWN_MS / 1000 },
    };
  }

  // ─── Đăng ký B2: Xác nhận OTP & tạo tài khoản ──────────
  async verifyRegisterOtp(dto: VerifyRegisterOtpDto) {
    const invalid = new BadRequestException('Mã xác thực không đúng hoặc đã hết hạn');
    const tooMany = new BadRequestException('Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại.');

    const ver = await this.prisma.verificationCode.findFirst({
      where: { email: dto.email, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!ver || ver.expiresAt.getTime() < Date.now()) throw invalid;
    if (ver.attempts >= RESET_MAX_ATTEMPTS) throw tooMany;

    const isValid = await bcrypt.compare(dto.code, ver.codeHash);
    if (!isValid) {
      await this.prisma.verificationCode.update({
        where: { id: ver.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = RESET_MAX_ATTEMPTS - ver.attempts - 1;
      if (remaining <= 0) throw tooMany;
      throw new BadRequestException(`Mã xác thực không đúng. Bạn còn ${remaining} lần thử.`);
    }

    const payload = ver.payload as {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string | null;
      passwordHash: string;
    };

    if (await this.findUserByEmail(dto.email)) {
      throw new ConflictException('Email này đã được đăng ký bởi tài khoản khác');
    }

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          phone: payload.phone || undefined,
          passwordHash: payload.passwordHash,
          isVerified: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email hoặc số điện thoại này đã được sử dụng');
      }
      throw error;
    }

    await this.prisma.verificationCode.update({
      where: { id: ver.id },
      data: { usedAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      success: true,
      message: '🎉 Đăng ký tài khoản thành công! Chào mừng bạn đến với TORCH SPORTS.',
      data: { user, ...tokens },
    };
  }

  // ─── Đăng nhập ───────────────────────────────────
  async login(dto: LoginDto) {
    // Tìm user theo email
    const user = await this.findUserByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.');
    }

    // Bật 2FA: chưa cấp token thật, yêu cầu mã Google Authenticator ở bước 2
    if (user.twoFAEnabled && user.twoFASecret) {
      const tempToken = await this.jwtService.signAsync(
        { sub: user.id, purpose: '2fa' },
        { secret: process.env.JWT_SECRET, expiresIn: '5m' },
      );
      return {
        success: true,
        message: 'Vui lòng nhập mã xác thực 6 số từ ứng dụng Google Authenticator',
        data: { requires2FA: true, tempToken },
      };
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      success: true,
      message: '✅ Đăng nhập thành công',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatar: user.avatar,
        },
        ...tokens,
      },
    };
  }

  // ─── 2FA: Đăng nhập bước 2 ───────────────────────
  async verifyTwoFactorLogin(tempToken: string, code: string) {
    let userId: string;
    try {
      const payload = this.jwtService.verify(tempToken, { secret: process.env.JWT_SECRET });
      if (payload.purpose !== '2fa') throw new Error();
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Phiên xác thực đã hết hạn. Vui lòng đăng nhập lại.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || !user.twoFAEnabled || !user.twoFASecret) {
      throw new UnauthorizedException('Phiên xác thực không hợp lệ');
    }
    await this.assertTotp(user.twoFASecret, code);

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      success: true,
      message: '✅ Đăng nhập thành công',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatar: user.avatar,
        },
        ...tokens,
      },
    };
  }

  // ─── 2FA: Trạng thái ───────────────────────────
  async getTwoFactorStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { twoFAEnabled: true } });
    return { success: true, data: { enabled: !!user?.twoFAEnabled } };
  }

  // ─── 2FA: Thiết lập (sinh secret + mã QR) ────────
  async setupTwoFactor(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (user.twoFAEnabled) throw new BadRequestException('Tài khoản đã bật xác thực 2 yếu tố');

    const secret = generateSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { twoFASecret: encryptSecret(secret) } });

    const otpauthUrl = generateURI({ issuer: 'TORCH SPORTS', label: user.email, secret });
    const qrCode = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 240 });

    return {
      success: true,
      message: 'Quét mã QR bằng Google Authenticator rồi nhập mã 6 số để hoàn tất.',
      data: { qrCode, secret, otpauthUrl },
    };
  }

  // ─── 2FA: Bật (xác nhận bằng mã đầu tiên) ─────────
  async enableTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFASecret) throw new BadRequestException('Vui lòng thiết lập 2FA trước');
    if (user.twoFAEnabled) throw new BadRequestException('Tài khoản đã bật xác thực 2 yếu tố');

    await this.assertTotp(user.twoFASecret, code);
    await this.prisma.user.update({ where: { id: userId }, data: { twoFAEnabled: true } });
    return { success: true, message: '🔐 Đã bật xác thực 2 yếu tố thành công!' };
  }

  // ─── 2FA: Tắt (cần mật khẩu + mã hiện tại) ───────
  async disableTwoFactor(userId: string, password: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFAEnabled || !user.twoFASecret) throw new BadRequestException('Tài khoản chưa bật 2FA');
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Mật khẩu không đúng');
    }
    await this.assertTotp(user.twoFASecret, code);
    await this.prisma.user.update({ where: { id: userId }, data: { twoFAEnabled: false, twoFASecret: null } });
    return { success: true, message: 'Đã tắt xác thực 2 yếu tố.' };
  }

  private async assertTotp(storedSecret: string, code: string) {
    let ok = false;
    try {
      const res = await verifyTotp({ secret: decryptSecret(storedSecret), token: code, epochTolerance: 30 });
      ok = res.valid;
    } catch {
      ok = false;
    }
    if (!ok) throw new BadRequestException('Mã xác thực không đúng hoặc đã hết hạn');
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_SECRET,
      });
      if (payload.purpose) throw new Error('invalid token purpose');

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Token không hợp lệ');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role);
      return { success: true, data: tokens };
    } catch {
      throw new UnauthorizedException('Refresh Token không hợp lệ hoặc đã hết hạn');
    }
  }

  // ─── Quên mật khẩu: B1 - gửi mã OTP về email ─────
  async forgotPassword(dto: ForgotPasswordDto) {
    // Luôn trả cùng một thông báo để không lộ email nào có trong hệ thống
    const response = {
      success: true,
      message:
        'Nếu email tồn tại trong hệ thống, mã xác nhận đã được gửi. Vui lòng kiểm tra hộp thư (kể cả mục Spam).',
      data: { expiresInMinutes: RESET_CODE_TTL_MINUTES, resendAfterSeconds: RESET_RESEND_COOLDOWN_MS / 1000 },
    };

    const user = await this.findUserByEmail(dto.email);
    if (!user || !user.isActive) return response;

    // Chống spam: mỗi tài khoản chỉ được yêu cầu mã mới sau 60 giây
    const latest = await this.prisma.passwordReset.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (latest && Date.now() - latest.createdAt.getTime() < RESET_RESEND_COOLDOWN_MS) {
      return response;
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = await bcrypt.hash(code, 10);

    // Vô hiệu hóa các mã cũ, tạo mã mới
    await this.prisma.$transaction([
      this.prisma.passwordReset.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordReset.create({
        data: {
          userId: user.id,
          codeHash,
          expiresAt: new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000),
        },
      }),
    ]);

    await this.mailService.sendPasswordResetCode(
      user.email,
      `${user.firstName} ${user.lastName}`.trim(),
      code,
      RESET_CODE_TTL_MINUTES,
    );

    return response;
  }

  // ─── Quên mật khẩu: B2 - kiểm tra mã OTP ─────────
  async verifyResetCode(dto: VerifyResetCodeDto) {
    await this.validateResetCode(dto.email, dto.code);
    return { success: true, message: 'Mã xác nhận hợp lệ. Vui lòng đặt mật khẩu mới.' };
  }

  // ─── Quên mật khẩu: B3 - đặt mật khẩu mới ────────
  async resetPassword(dto: ResetPasswordDto) {
    const { user, reset } = await this.validateResetCode(dto.email, dto.code);

    if (await bcrypt.compare(dto.newPassword, user.passwordHash)) {
      throw new BadRequestException('Mật khẩu mới không được trùng với mật khẩu cũ');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      this.prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ]);

    return { success: true, message: '🔐 Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.' };
  }

  // ─── Social Login ────────────────────────────────
  async socialLogin(dto: SocialLoginDto) {
    const providerField = `${dto.provider}Id`;

    // 1. Tìm user theo providerId
    let user = await this.prisma.user.findFirst({
      where: { [providerField]: dto.providerId },
    });

    if (!user) {
      // 2. Tìm theo email nếu chưa link
      if (dto.email) {
        user = await this.findUserByEmail(dto.email);
      }

      if (user) {
        // Link account
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { [providerField]: dto.providerId },
        });
      } else {
        // Create new account
        const randomPassword = randomInt(0, 99999999).toString(16);
        const passwordHash = await bcrypt.hash(randomPassword, 12);
        
        user = await this.prisma.user.create({
          data: {
            email: dto.email || `${dto.providerId}@${dto.provider}.local`,
            firstName: dto.firstName,
            lastName: dto.lastName,
            avatar: dto.avatar,
            passwordHash,
            isVerified: true,
            [providerField]: dto.providerId,
          },
        });
      }
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    // 3. Xử lý 2FA (tương tự login thường)
    if (user.twoFAEnabled) {
      const tempToken = await this.jwtService.signAsync(
        { sub: user.id, email: user.email, purpose: '2fa' },
        { secret: process.env.JWT_SECRET, expiresIn: '5m' },
      );
      return { requires2FA: true, tempToken };
    }

    // 4. Trả về token và user
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    const { passwordHash, twoFASecret, ...userWithoutSensitiveData } = user;
    return { user: userWithoutSensitiveData, ...tokens };
  }

  // ─── Helpers ─────────────────────────────────────
  private findUserByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
    });
  }

  private async validateResetCode(email: string, code: string) {
    const invalid = new BadRequestException('Mã xác nhận không đúng hoặc đã hết hạn');
    const tooMany = new BadRequestException('Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.');

    const user = await this.findUserByEmail(email);
    if (!user || !user.isActive) throw invalid;

    const reset = await this.prisma.passwordReset.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!reset || reset.expiresAt.getTime() < Date.now()) throw invalid;
    if (reset.attempts >= RESET_MAX_ATTEMPTS) throw tooMany;

    const isValid = await bcrypt.compare(code, reset.codeHash);
    if (!isValid) {
      await this.prisma.passwordReset.update({
        where: { id: reset.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = RESET_MAX_ATTEMPTS - reset.attempts - 1;
      if (remaining <= 0) throw tooMany;
      throw new BadRequestException(`Mã xác nhận không đúng. Bạn còn ${remaining} lần thử.`);
    }

    return { user, reset };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
