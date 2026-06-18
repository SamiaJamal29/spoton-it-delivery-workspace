export class CreateReleaseDto {
  version: string;
  releaseDate?: string;
  summary?: string;
  workItemIds?: string[];
}

export class UpdateReleaseDto {
  version?: string;
  releaseDate?: string;
  summary?: string;
  deploymentStatus?: 'draft' | 'scheduled' | 'deployed' | 'rolled_back';
  workItemIds?: string[];
}
