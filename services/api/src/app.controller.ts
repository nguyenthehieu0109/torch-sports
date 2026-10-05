import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'API Root', description: 'Trang chào mừng API TORCH SPORTS' })
  @ApiResponse({ status: 200, description: 'API đang hoạt động bình thường' })
  getRoot() {
    return {
      name: '🔥 TORCH SPORTS API',
      version: '1.0.0',
      status: 'running',
      docs: '/api/docs',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health Check', description: 'Kiểm tra trạng thái hoạt động của API và Database' })
  @ApiResponse({ status: 200, description: 'Hệ thống hoạt động bình thường' })
  getHealth() {
    return this.appService.getHealth();
  }
}
