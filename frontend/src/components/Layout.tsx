import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from './Button';
import './Layout.css';

interface LayoutProps {
  title: string;
  navItems?: Array<{ path: string; label: string; icon?: string }>;
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ title, navItems = [], children }) => {
  const { logout, role } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="layout-header-content">
          <h1 className="layout-title">{title}</h1>
          <div className="layout-header-actions">
            <span className="layout-user-role">{role}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="layout-body">
        <nav className="layout-sidebar">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="layout-nav-item"
            >
              {item.icon && <span className="layout-nav-icon">{item.icon}</span>}
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="layout-main">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};
