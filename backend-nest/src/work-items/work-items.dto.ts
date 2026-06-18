export class CreateWorkItemDto {
  title: string;
  description?: string;
  type?: 'feature' | 'bug' | 'improvement' | 'maintenance';
  status?: 'backlog' | 'planned' | 'in_progress' | 'qa' | 'ready_for_release' | 'released';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  dueDate?: string;
}

export class UpdateWorkItemDto {
  title?: string;
  description?: string;
  type?: 'feature' | 'bug' | 'improvement' | 'maintenance';
  status?: 'backlog' | 'planned' | 'in_progress' | 'qa' | 'ready_for_release' | 'released';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  dueDate?: string;
}
