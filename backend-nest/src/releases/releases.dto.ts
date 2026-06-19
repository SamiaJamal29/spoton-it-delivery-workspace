import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsArray, IsUUID, MaxLength } from 'class-validator';

const DEPLOYMENT_STATUSES = ['draft', 'scheduled', 'deployed', 'rolled_back'] as const;

export class CreateReleaseDto {
  @IsString()
  @IsNotEmpty({ message: 'version is required' })
  @MaxLength(50)
  version: string;

  @IsOptional()
  @IsDateString({}, { message: 'releaseDate must be a valid date string (YYYY-MM-DD)' })
  releaseDate?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each workItemId must be a valid UUID' })
  workItemIds?: string[];
}

export class UpdateReleaseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'version cannot be empty' })
  @MaxLength(50)
  version?: string;

  @IsOptional()
  @IsDateString({}, { message: 'releaseDate must be a valid date string (YYYY-MM-DD)' })
  releaseDate?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsEnum(DEPLOYMENT_STATUSES, { message: 'deploymentStatus must be one of: draft, scheduled, deployed, rolled_back' })
  deploymentStatus?: 'draft' | 'scheduled' | 'deployed' | 'rolled_back';

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each workItemId must be a valid UUID' })
  workItemIds?: string[];
}
