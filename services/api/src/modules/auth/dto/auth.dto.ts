import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// ─── Quy tắc dùng chung (đồng bộ với apps/web/src/lib/validators.ts) ───
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;
export const PASSWORD_MESSAGE =
  'Mật khẩu phải từ 8-64 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt';
export const PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
export const NAME_REGEX = /^[\p{L}\s'.-]+$/u;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const emptyToUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const v = value.replace(/\s+/g, '');
  return v === '' ? undefined : v;
};

class EmailField {
  @ApiProperty({ example: 'user@gmail.com', description: 'Địa chỉ email' })
  @Transform(normalizeEmail)
  @IsNotEmpty({ message: 'Vui lòng nhập email' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @MaxLength(254, { message: 'Email quá dài' })
  email: string;
}

export class RegisterDto extends EmailField {
  @ApiProperty({ example: 'Nguyễn Văn', description: 'Họ người dùng' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập họ' })
  @MaxLength(50, { message: 'Họ tối đa 50 ký tự' })
  @Matches(NAME_REGEX, { message: 'Họ chỉ được chứa chữ cái' })
  firstName: string;

  @ApiProperty({ example: 'An', description: 'Tên người dùng' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên' })
  @MaxLength(50, { message: 'Tên tối đa 50 ký tự' })
  @Matches(NAME_REGEX, { message: 'Tên chỉ được chứa chữ cái' })
  lastName: string;

  @ApiPropertyOptional({ example: '0912345678', description: 'Số điện thoại Việt Nam' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @Matches(PHONE_REGEX, { message: 'Số điện thoại không hợp lệ (VD: 0912345678)' })
  phone?: string;

  @ApiProperty({ example: 'Password@123', description: PASSWORD_MESSAGE })
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password: string;
}

export class LoginDto extends EmailField {
  @ApiProperty({ example: 'Password@123', description: 'Mật khẩu' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' })
  @MaxLength(64, { message: 'Mật khẩu không hợp lệ' })
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh Token JWT' })
  @IsString()
  refreshToken: string;
}

export class SocialLoginDto {
  @ApiProperty({ example: 'google' })
  @IsString()
  @IsNotEmpty()
  provider: 'google' | 'facebook' | 'github' | 'linkedin' | 'zalo';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  providerId: string;

  @ApiProperty()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  avatar?: string;
}

// ─── Quên mật khẩu ───────────────────────────────
export class ForgotPasswordDto extends EmailField {}

export class VerifyResetCodeDto extends EmailField {
  @ApiProperty({ example: '123456', description: 'Mã OTP 6 chữ số gửi về email' })
  @Transform(trim)
  @IsString()
  @Length(6, 6, { message: 'Mã xác nhận gồm 6 chữ số' })
  @Matches(/^\d{6}$/, { message: 'Mã xác nhận gồm 6 chữ số' })
  code: string;
}

export class VerifyRegisterOtpDto extends VerifyResetCodeDto {}

export class ResetPasswordDto extends VerifyResetCodeDto {
  @ApiProperty({ example: 'NewPassword@123', description: PASSWORD_MESSAGE })
  @IsString()
  @MinLength(8, { message: PASSWORD_MESSAGE })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword: string;
}
