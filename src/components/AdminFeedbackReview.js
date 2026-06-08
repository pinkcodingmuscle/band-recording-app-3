import React, { useEffect, useMemo, useState } from 'react';
import './AdminFeedbackReview.css';
import {
  apiFeedbackAdminDelete,
  apiFeedbackAdminList,
  apiFeedbackAdminUpdateStatus,
  isApiConfigured,
} from '../lib/api';
import { useToast } from '../context/ToastContext';

const CATEGORY_OPTIONS = ['all', 'bug_report', 'feature_request', 'general', 'praise', 'challenge'];
const STATUS_OPTIONS = ['all', 'new', 'reviewed', 'planned', 'resolved', 'wont_fix'];

function AdminFeedbackReview() {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [savingId, setSavingId] = useState('');

  const query = useMemo(() => ({
    page: 1,
    status: statusFilter === 'all' ? undefined : statusFilter,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
  }), [statusFilter, categoryFilter]);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!isApiConfigured) {
        setLoading(false);
        setError('Admin feedback review requires a live backend connection.');
        return;
      }

      setLoading(true);
      setError('');
      try {
        const result = await apiFeedbackAdminList(query);
        if (!alive) return;
        const rows = (result.feedback || []).map((item) => ({
          ...item,
          draftStatus: item.status || 'new',
          draftNotes: item.adminNotes || '',
        }));
        setItems(rows);
      } catch (err) {
        if (!alive) return;
        setError(err.message || 'Could not load feedback.');
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => { alive = false; };
  }, [query]);

  const setDraft = (id, field, value) => {
    setItems((prev) => prev.map((item) => item._id === id ? { ...item, [field]: value } : item));
  };

  const saveRow = async (item) => {
    setSavingId(item._id);
    try {
      const updated = await apiFeedbackAdminUpdateStatus(item._id, {
        status: item.draftStatus,
        adminNotes: item.draftNotes,
      });
      setItems((prev) => prev.map((row) => (
        row._id === item._id
          ? {
              ...updated,
              draftStatus: updated.status || 'new',
              draftNotes: updated.adminNotes || '',
            }
          : row
      )));
      showToast('Feedback updated', 'success');
    } catch (err) {
      showToast(err.message || 'Update failed', 'error');
    } finally {
      setSavingId('');
    }
  };

  const deleteRow = async (item) => {
    if (!window.confirm('Delete this feedback item?')) return;

    setSavingId(item._id);
    try {
      await apiFeedbackAdminDelete(item._id);
      setItems((prev) => prev.filter((row) => row._id !== item._id));
      showToast('Feedback deleted', 'success');
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="admin-feedback">
      <div className="admin-feedback-head">
        <h2>Feedback Review</h2>
        <div className="admin-feedback-filters">
          <label>
            Status
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label>
            Category
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              {CATEGORY_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        </div>
      </div>

      {loading && <p className="admin-feedback-info">Loading feedback...</p>}
      {!loading && error && <p className="admin-feedback-error">{error}</p>}
      {!loading && !error && items.length === 0 && <p className="admin-feedback-info">No feedback items found.</p>}

      {!loading && !error && items.length > 0 && (
        <div className="admin-feedback-list">
          {items.map((item) => (
            <article key={item._id} className="admin-feedback-item">
              <header>
                <div>
                  <strong>{item.category}</strong>
                  <span className="admin-feedback-meta"> · user {item.userId} · {new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <span className={`feedback-status ${item.status || 'new'}`}>{item.status || 'new'}</span>
              </header>

              <p className="admin-feedback-desc">{item.description || 'No description provided.'}</p>

              <div className="admin-feedback-row">
                <label>
                  Status
                  <select
                    value={item.draftStatus}
                    onChange={(e) => setDraft(item._id, 'draftStatus', e.target.value)}
                  >
                    {STATUS_OPTIONS.filter((v) => v !== 'all').map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </label>

                <label className="notes-field">
                  Admin notes
                  <input
                    type="text"
                    value={item.draftNotes}
                    onChange={(e) => setDraft(item._id, 'draftNotes', e.target.value)}
                    placeholder="Add internal notes"
                  />
                </label>
              </div>

              <div className="admin-feedback-actions">
                <button
                  type="button"
                  onClick={() => saveRow(item)}
                  disabled={savingId === item._id}
                >
                  {savingId === item._id ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => deleteRow(item)}
                  disabled={savingId === item._id}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminFeedbackReview;
