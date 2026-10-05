import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách sản phẩm',
    description: 'Trả về danh sách sản phẩm có hỗ trợ phân trang và tìm kiếm',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'search', required: false, description: 'Tìm kiếm theo tên sản phẩm' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiResponse({ status: 200, description: '✅ Danh sách sản phẩm có phân trang' })
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
  ) {
    return this.productsService.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      categoryId,
      brandId,
    });
  }
}
