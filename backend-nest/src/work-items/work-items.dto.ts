import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, MaxLength } from 'class-validator';

const ITEM_TYPES = ['feature', 'bug', 'improvement', 'maintenance'] as const;
const ITEM_STATUSES = ['backlog', 'planned', 'in_progress', 'qa', 'ready_for_release', 'released'] as const;
const ITEM_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export class CreateWorkItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ITEM_TYPES, { message: 'type must be one of: feature, bug, improvement, maintenance' })
  type?: 'feature' | 'bug' | 'improvement' | 'maintenance';

  @IsOptional()
  @IsEnum(ITEM_STATUSES, { message: 'Invalid status value' })
  status?: 'backlog' | 'planned' | 'in_progress' | 'qa' | 'ready_for_release' | 'released';

  @IsOptional()
  @IsEnum(ITEM_PRIORITIES, { message: 'priority must be one of: low, medium, high, urgent' })
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  @IsOptional()
  @IsString()
  assignee?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dueDate must be a valid date string (YYYY-MM-DD)' })
  dueDate?: string;

  @IsOptional()
  @IsString()
  projectId?: string;
}

export class UpdateWorkItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Title cannot be empty' })
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ITEM_TYPES, { message: 'type must be one of: feature, bug, improvement, maintenance' })
  type?: 'feature' | 'bug' | 'improvement' | 'maintenance';

  @IsOptional()
  @IsEnum(ITEM_STATUSES, { message: 'Invalid status value' })
  status?: 'backlog' | 'planned' | 'in_progress' | 'qa' | 'ready_for_release' | 'released';

  @IsOptional()
  @IsEnum(ITEM_PRIORITIES, { message: 'priority must be one of: low, medium, high, urgent' })
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  @IsOptional()
  @IsString()
  assignee?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dueDate must be a valid date string (YYYY-MM-DD)' })
  dueDate?: string;
}
