import { Controller, Get, Post, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  VerifyResetCodeDto,
  VerifyRegisterOtpDto,
  ResetPasswordDto,
  SocialLoginDto,
} from './dto/auth.dto';
import { TwoFactorCodeDto, TwoFactorLoginDto, DisableTwoFactorDto } from './dto/two-factor.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ long: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Đăng ký B1: Gửi mã OTP xác thực email',
    description: 'Kiểm tra thông tin và gửi mã OTP 6 chữ số tới email người dùng.',
  })
  @ApiResponse({ status: 201, description: '✅ Đã gửi mã OTP xác thực' })
  @ApiResponse({ status: 409, description: '❌ Email hoặc số điện thoại đã được sử dụng' })
  @ApiResponse({ status: 400, description: '❌ Dữ liệu không hợp lệ' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.sendRegisterOtp(registerDto);
  }

  @Post('verify-register-otp')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ long: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Đăng ký B2: Nhập OTP xác thực & Tạo tài khoản',
    description: 'Xác thực mã OTP 6 chữ số và khởi tạo tài khoản chính thức.',
  })
  @ApiResponse({ status: 201, description: '✅ Đăng ký tài khoản thành công' })
  @ApiResponse({ status: 400, description: '❌ Mã OTP không đúng hoặc đã hết hạn' })
  verifyRegisterOtp(@Body() dto: VerifyRegisterOtpDto) {
    return this.authService.verifyRegisterOtp(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ long: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Đăng nhập',
    description: 'Xác thực và nhận JWT Access Token + Refresh Token',
  })
  @ApiResponse({ status: 200, description: '✅ Đăng nhập thành công, trả về JWT tokens' })
  @ApiResponse({ status: 401, description: '❌ Email hoặc mật khẩu không đúng' })
  @ApiResponse({ status: 429, description: '❌ Thử quá nhiều lần' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('social-login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ long: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Đăng nhập Mạng xã hội',
    description: 'Xác thực qua Google, Facebook, Zalo... và trả về JWT hoặc yêu cầu 2FA',
  })
  socialLogin(@Body() dto: SocialLoginDto) {
    return this.authService.socialLogin(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Làm mới Access Token',
    description: 'Dùng Refresh Token để lấy Access Token mới khi token cũ hết hạn',
  })
  @ApiResponse({ status: 200, description: '✅ Token mới được cấp phát thành công' })
  @ApiResponse({ status: 401, description: '❌ Refresh Token không hợp lệ hoặc đã hết hạn' })
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ long: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Quên mật khẩu — gửi mã OTP',
    description: 'Gửi mã 6 chữ số về email. Mã hết hạn sau 10 phút, gửi lại sau 60 giây.',
  })
  @ApiResponse({ status: 200, description: '✅ Đã xử lý yêu cầu (không tiết lộ email có tồn tại hay không)' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('verify-reset-code')
  @HttpCode(HttpStatus.OK)
  @Throttle({ long: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Quên mật khẩu — kiểm tra mã OTP' })
  @ApiResponse({ status: 200, description: '✅ Mã hợp lệ' })
  @ApiResponse({ status: 400, description: '❌ Mã sai, hết hạn hoặc nhập sai quá 5 lần' })
  verifyResetCode(@Body() dto: VerifyResetCodeDto) {
    return this.authService.verifyResetCode(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ long: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Quên mật khẩu — đặt mật khẩu mới' })
  @ApiResponse({ status: 200, description: '✅ Đổi mật khẩu thành công' })
  @ApiResponse({ status: 400, description: '❌ Mã không hợp lệ hoặc mật khẩu không đạt yêu cầu' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ─── 2FA (Google Authenticator) ──────────────────────
  @Post('2fa/login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ long: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: '2FA — đăng nhập bước 2 bằng mã Google Authenticator' })
  verifyTwoFactorLogin(@Body() dto: TwoFactorLoginDto) {
    return this.authService.verifyTwoFactorLogin(dto.tempToken, dto.code);
  }

  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '2FA — xem trạng thái bật/tắt' })
  twoFactorStatus(@Req() req: { user: { id: string } }) {
    return this.authService.getTwoFactorStatus(req.user.id);
  }

  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '2FA — sinh secret và mã QR' })
  setupTwoFactor(@Req() req: { user: { id: string } }) {
    return this.authService.setupTwoFactor(req.user.id);
  }

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Throttle({ long: { limit: 10, ttl: 60_000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: '2FA — bật, xác nhận bằng mã 6 số đầu tiên' })
  enableTwoFactor(@Req() req: { user: { id: string } }, @Body() dto: TwoFactorCodeDto) {
    return this.authService.enableTwoFactor(req.user.id, dto.code);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Throttle({ long: { limit: 5, ttl: 60_000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: '2FA — tắt, cần mật khẩu + mã hiện tại' })
  disableTwoFactor(@Req() req: { user: { id: string } }, @Body() dto: DisableTwoFactorDto) {
    return this.authService.disableTwoFactor(req.user.id, dto.password, dto.code);
  }
}
