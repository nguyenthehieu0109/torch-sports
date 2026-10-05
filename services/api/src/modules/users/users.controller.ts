import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin người dùng theo ID' })
  @ApiResponse({ status: 200, description: '✅ Trả về thông tin người dùng' })
  @ApiResponse({ status: 404, description: '❌ Không tìm thấy người dùng' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy danh sách người dùng (Chỉ Admin)', description: 'Yêu cầu quyền ADMIN' })
  @ApiResponse({ status: 200, description: '✅ Danh sách người dùng' })
  @ApiResponse({ status: 403, description: '❌ Không có quyền truy cập' })
  findAll() {
    return this.usersService.findAll();
  }
}
