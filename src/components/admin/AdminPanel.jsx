import React, { useMemo, useState } from 'react';
import { MdDashboard, MdPeople } from 'react-icons/md';
import './AdminPanel.css';
import { useAuth } from '../../auth/AuthContext';
import AdminDashboard from './AdminDashboard';
import AdminUserManagement from './AdminUserManagement';

const AdminPanel = () => {
  const { user, loading: authLoading, isAdmin, profileLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const pageTitle = useMemo(() => {
    if (activeTab === 'users') return 'User Management';
    return 'Admin Dashboard';
  }, [activeTab]);

  if (authLoading || (user?.uid && profileLoading)) {
    return (
      <div className="admin-shell">
        <div className="admin-main">
          <h1 className="admin-title">Loading…</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-shell">
        <div className="admin-main">
          <h1 className="admin-title">Not authorized</h1>
          <p className="admin-muted">Please log in to access admin tools.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-shell">
        <div className="admin-main">
          <h1 className="admin-title">Not authorized</h1>
          <p className="admin-muted">This account does not have admin access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-inner">
          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="admin-nav-icon" aria-hidden="true">
              <MdDashboard size={18} />
            </span>
            Dashboard
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <span className="admin-nav-icon" aria-hidden="true">
              <MdPeople size={18} />
            </span>
            User management
          </button>
        </div>
      </aside>

      <main className="admin-main" aria-label={pageTitle}>
        {activeTab === 'users' ? <AdminUserManagement /> : <AdminDashboard />}
      </main>
    </div>
  );
};

export default AdminPanel;
