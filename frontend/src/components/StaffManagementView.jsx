import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserPlus, Trash2, Key, Users, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function StaffManagementView() {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // New staff form state
  const [isAdding, setIsAdding] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '', role: 'staff' });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.users.list();
      if (res.success) {
        setStaff(res.users);
      }
    } catch (err) {
      setError(err.message || 'Failed to load staff accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const res = await api.users.create(newStaff);
      if (res.success) {
        setSuccess('Staff account created successfully!');
        setIsAdding(false);
        setNewStaff({ name: '', email: '', password: '', role: 'staff' });
        fetchStaff();
      }
    } catch (err) {
      setError(err.message || 'Failed to create staff account');
    }
  };

  const handleDeleteStaff = async (id, email) => {
    if (!window.confirm(`Are you sure you want to delete the account for ${email}?`)) return;
    
    setError(null);
    setSuccess(null);
    try {
      const res = await api.users.delete(id);
      if (res.success) {
        setSuccess('Staff account deleted successfully!');
        fetchStaff();
      }
    } catch (err) {
      setError(err.message || 'Failed to delete staff account');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="card text-center py-12">
        <ShieldCheck size={48} className="mx-auto text-blood-red mb-4" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-text-muted mt-2">Only Hospital Administrators can manage staff accounts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users size={24} className="text-brand-primary" />
            Hospital Staff Management
          </h2>
          <p className="text-text-muted text-sm mt-1">Manage clinical access and roles for hospital personnel.</p>
        </div>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="btn btn-primary flex items-center gap-2">
            <UserPlus size={18} />
            Add Staff Member
          </button>
        )}
      </div>

      {error && (
        <div className="bg-blood-red-light border border-blood-red-border text-blood-red p-3 rounded-md flex items-center gap-2 text-sm">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {success && (
        <div className="bg-status-eligible-bg border border-status-eligible-border text-status-eligible p-3 rounded-md flex items-center gap-2 text-sm">
          <CheckCircle2 size={18} /> {success}
        </div>
      )}

      {isAdding && (
        <div className="card bg-surface-hover border border-border-light">
          <h3 className="font-semibold mb-4 text-lg">Register New Staff Account</h3>
          <form onSubmit={handleCreateStaff} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Dr. John Doe"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Hospital Email</label>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="name@hospital.med"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Temporary Password</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="SecurePassword123!"
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role Level</label>
                <select
                  className="form-input"
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                >
                  <option value="staff">Clinical Staff (Data Entry & Viewing)</option>
                  <option value="admin">Administrator (Full System Access)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button type="button" onClick={() => setIsAdding(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">Create Account</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="text-center py-8 text-text-muted">Loading staff directory...</div>
        ) : (
          <table className="data-table w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-hover border-b border-border-light text-xs uppercase text-text-muted tracking-wider">
                <th className="p-4 font-semibold">Name & Email</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Security (2FA)</th>
                <th className="p-4 font-semibold">Joined Date</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light text-sm">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-text-main">{s.name}</div>
                    <div className="text-text-muted text-xs">{s.email}</div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      s.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {s.role === 'admin' ? 'Administrator' : 'Staff'}
                    </span>
                  </td>
                  <td className="p-4">
                    {s.two_factor_enabled ? (
                      <span className="flex items-center gap-1 text-status-eligible text-xs font-semibold">
                        <Key size={14} /> Enrolled
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-status-overdue text-xs font-semibold">
                        <AlertCircle size={14} /> Pending Setup
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-text-muted">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    {s.email !== 'admin@hospital.med' && s.id !== user?.id && (
                      <button
                        onClick={() => handleDeleteStaff(s.id, s.email)}
                        className="text-blood-red hover:bg-blood-red-light p-2 rounded transition-colors"
                        title="Remove Access"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-text-muted">
                    No staff accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
