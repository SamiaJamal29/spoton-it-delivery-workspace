import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import type { RequestUser } from '../common/request-user';
import { WorkItemsService } from './work-items.service';
import { CreateWorkItemDto, UpdateWorkItemDto } from './work-items.dto';

@UseGuards(JwtAuthGuard)
@Controller('work-items')
export class WorkItemsController {
  constructor(private readonly service: WorkItemsService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignee') assignee?: string,
    @Query('search') search?: string,
    @Query('myWork') myWork?: string,
    @Query('projectId') projectId?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.service.findAll({ status, priority, assignee, search, myWork, projectId, userId: user?.id });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateWorkItemDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWorkItemDto, @CurrentUser() user: RequestUser) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
