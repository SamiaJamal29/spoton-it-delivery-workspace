export class CreateQaCheckDto {
  workItemId: string;
  testTitle: string;
  expectedResult?: string;
  actualResult?: string;
  tester?: string;
  notes?: string;
}

export class UpdateQaCheckDto {
  testTitle?: string;
  expectedResult?: string;
  actualResult?: string;
  status?: 'pending' | 'passed' | 'failed';
  tester?: string;
  notes?: string;
}
