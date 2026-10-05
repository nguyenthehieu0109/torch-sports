import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ─── Global Prefix ───────────────
  app.setGlobalPrefix('api');

  // ─── Validation Pipe ─────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ─── CORS ────────────────────────
  app.enableCors({
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // ─── Swagger Documentation ────────
  const config = new DocumentBuilder()
    .setTitle('🔥 TORCH SPORTS API')
    .setDescription(
      `**TORCH SPORTS** — Nền tảng thương mại điện tử dụng cụ & trang phục thể thao tích hợp AI.
      
## Xác thực (Authentication)
Sử dụng **JWT Bearer Token**. Sau khi đăng nhập tại \`/api/auth/login\`, copy \`accessToken\` và nhấn nút **Authorize** ở trên để sử dụng các API yêu cầu đăng nhập.

## Base URL
- **Development:** \`http://localhost:3000/api\`
- **Staging:** \`https://staging-api.torchsports.vn/api\`
- **Production:** \`https://api.torchsports.vn/api\`
      `,
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Nhập Access Token JWT vào đây',
        in: 'header',
      },
      'access-token',
    )
    .addTag('Auth', 'Đăng ký, đăng nhập và xác thực người dùng')
    .addTag('Users', 'Quản lý tài khoản và hồ sơ người dùng')
    .addTag('Products', 'Quản lý danh mục sản phẩm thể thao')
    .addTag('Categories', 'Quản lý danh mục và thể loại')
    .addTag('Orders', 'Đặt hàng và theo dõi đơn hàng')
    .addTag('Payments', 'Thanh toán VNPay, MoMo, Stripe...')
    .addTag('Inventory', 'Quản lý kho hàng và tồn kho')
    .addTag('Health', 'Kiểm tra trạng thái hệ thống')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: '🔥 TORCH SPORTS API Docs',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  // ─── Start Server ─────────────────
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log('\n\x1b[33m🔥 TORCH SPORTS API is running!\x1b[0m');
  console.log(
    `\x1b[36m➜  Server:   \x1b[0mhttp://localhost:${port}/api`,
  );
  console.log(
    `\x1b[36m➜  Swagger:  \x1b[0mhttp://localhost:${port}/api/docs`,
  );
  console.log(
    `\x1b[36m➜  Env:      \x1b[0m${process.env.NODE_ENV ?? 'development'}\n`,
  );
}

bootstrap();
