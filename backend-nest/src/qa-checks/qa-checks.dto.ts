import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, MaxLength } from 'class-validator';

const QA_STATUSES = ['pending', 'passed', 'failed'] as const;

export class CreateQaCheckDto {
  @IsUUID('4', { message: 'workItemId must be a valid UUID' })
  workItemId: string;

  @IsString()
  @IsNotEmpty({ message: 'testTitle is required' })
  @MaxLength(255)
  testTitle: string;

  @IsOptional()
  @IsString()
  expectedResult?: string;

  @IsOptional()
  @IsString()
  actualResult?: string;

  @IsOptional()
  @IsString()
  tester?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateQaCheckDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'testTitle cannot be empty' })
  @MaxLength(255)
  testTitle?: string;

  @IsOptional()
  @IsString()
  expectedResult?: string;

  @IsOptional()
  @IsString()
  actualResult?: string;

  @IsOptional()
  @IsEnum(QA_STATUSES, { message: 'status must be one of: pending, passed, failed' })
  status?: 'pending' | 'passed' | 'failed';

  @IsOptional()
  @IsString()
  tester?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
