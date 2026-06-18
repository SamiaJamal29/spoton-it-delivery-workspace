'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, WorkItem } from '@/lib/api';
import WorkItemForm from '@/components/WorkItemForm';

export default function EditWorkItemPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<WorkItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.workItems.get(id).then(setItem).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="workspace-loading">Loading…</div>;
  if (!item) return <div className="workspace-error">Item not found</div>;

  return <WorkItemForm mode="edit" id={id} initial={item} />;
}
