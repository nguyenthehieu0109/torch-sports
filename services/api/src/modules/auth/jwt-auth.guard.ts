import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Bảo vệ các route cần đăng nhập. Chỉ chấp nhận Access Token thường,
 * từ chối token tạm của bước 2FA (có thuộc tính `purpose`).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Vui lòng đăng nhập');

    try {
      const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
      if (payload.purpose) throw new Error('invalid token purpose');
      req.user = { id: payload.sub, email: payload.email, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
    }
  }
}
