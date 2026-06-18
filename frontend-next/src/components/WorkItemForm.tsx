'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, WorkItem } from '@/lib/api';

type Props = {
  initial?: Partial<WorkItem>;
  mode: 'create' | 'edit';
  id?: string;
};

export default function WorkItemForm({ initial = {}, mode, id }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: initial.title ?? '',
    description: initial.description ?? '',
    type: initial.type ?? 'feature',
    priority: initial.priority ?? 'medium',
    assignee: initial.assignee ?? '',
    dueDate: initial.dueDate ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const submit = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSubmitting(true);
    setError('');
    try {
      if (mode === 'create') {
        await api.workItems.create(form);
        router.push('/pm/dashboard');
      } else {
        await api.workItems.update(id!, form);
        router.push(`/pm/work-items/${id}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
      setSubmitting(false);
    }
  };

  return (
    <div className="workspace">
      <div className="form-page-header">
        <h1 className="workspace-title">{mode === 'create' ? 'New Task' : 'Edit Task'}</h1>
      </div>

      {error && <div className="workspace-error">{error}</div>}

      <div className="form-card">
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input className="form-input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Short clear title" />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-textarea" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Enough detail for implementation and testing" rows={4} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-select" value={form.type} onChange={(e) => set('type', e.target.value)}>
              <option value="feature">Feature</option>
              <option value="bug">Bug</option>
              <option value="improvement">Improvement</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-select" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Assignee</label>
            <select className="form-select" value={form.assignee} onChange={(e) => set('assignee', e.target.value)}>
              <option value="">Unassigned</option>
              <option value="Maya Hassan">Maya Hassan</option>
              <option value="Lina Farouk">Lina Farouk</option>
              <option value="Omar Ahmed">Omar Ahmed</option>
              <option value="Sara Khalil">Sara Khalil</option>
              <option value="Ahmed Mostafa">Ahmed Mostafa</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input className="form-input" type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </div>
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Saving…' : mode === 'create' ? 'Create Task' : 'Save Changes'}
          </button>
          <button className="btn" onClick={() => router.back()}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
