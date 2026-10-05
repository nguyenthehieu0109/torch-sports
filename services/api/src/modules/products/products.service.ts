import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface FindAllParams {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll({ page, limit, search, categoryId, brandId }: FindAllParams) {
    const skip = (page - 1) * limit;

    const where: any = { status: 'ACTIVE' };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, logo: true } },
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      success: true,
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }
}
