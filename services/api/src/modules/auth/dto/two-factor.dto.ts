import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

const digits = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/\s+/g, '') : value;

export class TwoFactorCodeDto {
  @ApiProperty({ example: '123456', description: 'Mã 6 số từ Google Authenticator' })
  @Transform(digits)
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Mã xác thực gồm 6 chữ số' })
  code: string;
}

export class TwoFactorLoginDto extends TwoFactorCodeDto {
  @ApiProperty({ description: 'Token tạm nhận được từ bước đăng nhập' })
  @IsString()
  @IsNotEmpty()
  tempToken: string;
}

export class DisableTwoFactorDto extends TwoFactorCodeDto {
  @ApiProperty({ description: 'Mật khẩu hiện tại' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' })
  @MaxLength(64)
  password: string;
}
