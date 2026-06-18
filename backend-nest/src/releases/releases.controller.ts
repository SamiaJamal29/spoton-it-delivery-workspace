import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import type { RequestUser } from '../common/request-user';
import { ReleasesService } from './releases.service';
import { CreateReleaseDto, UpdateReleaseDto } from './releases.dto';

@UseGuards(JwtAuthGuard)
@Controller('releases')
export class ReleasesController {
  constructor(private readonly service: ReleasesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateReleaseDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateReleaseDto, @CurrentUser() user: RequestUser) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
