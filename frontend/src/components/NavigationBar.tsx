'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { api } from '../lib/api';
import {
  AlertTriangle,
  FileText,
  History,
  LogIn,
  LogOut,
  PlusCircle,
  Radio,
  RefreshCw,
  Shield,
  Sparkles,
} from 'lucide-react';

import Logo from './Logo';

export default function NavigationBar() {
  const pathname = usePathname();
  const { user, publicAccessEnabled, logout } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      await api.seedDemoData();
      setSeedSuccess(true);
      setTimeout(() => {
        setSeedSuccess(false);
        window.location.href = '/';
      }, 1000);
    } catch (err: any) {
      alert(`Failed to seed demo data: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <header className="navbar">
      <Link href="/" className="nav-brand" style={{ display: 'inline-flex', alignItems: 'center' }}>
        <Logo size={24} showText={true} />
      </Link>

      <nav className="nav-links">
        <Link
          href="/"
          className={`nav-link ${pathname === '/' ? 'active' : ''}`}
        >
          <Radio size={16} />
          <span>Console</span>
        </Link>
        <Link
          href="/incidents"
          className={`nav-link ${pathname.startsWith('/incidents') && pathname !== '/incidents/new' ? 'active' : ''}`}
        >
          <AlertTriangle size={16} />
          <span>Incidents</span>
        </Link>
        <Link
          href="/incidents/new"
          className={`nav-link ${pathname === '/incidents/new' ? 'active' : ''}`}
        >
          <PlusCircle size={16} />
          <span>New Incident</span>
        </Link>
        <Link
          href="/audit"
          className={`nav-link ${pathname === '/audit' ? 'active' : ''}`}
        >
          <History size={16} />
          <span>Audit Log</span>
        </Link>
      </nav>

      <div className="nav-actions">
        <button
          onClick={handleSeedDemo}
          disabled={seeding}
          className="btn btn-secondary btn-sm"
          title="Seed realistic synthetic incidents for evaluation"
        >
          <Sparkles size={14} color="#a855f7" />
          <span>{seedSuccess ? 'Seeded!' : seeding ? 'Seeding...' : 'Demo Data'}</span>
        </button>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#6ee7b7',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              {user.role}
            </span>
            <button onClick={logout} className="btn btn-secondary btn-sm" title="Sign out">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="badge"
              style={{
                backgroundColor: publicAccessEnabled
                  ? 'rgba(56, 189, 248, 0.12)'
                  : 'rgba(239, 68, 68, 0.12)',
                color: publicAccessEnabled ? '#7dd3fc' : '#fca5a5',
                border: `1px solid ${publicAccessEnabled ? 'rgba(56, 189, 248, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}
            >
              {publicAccessEnabled ? 'Public Viewer' : 'Auth Required'}
            </span>
            <Link href="/login" className="btn btn-primary btn-sm">
              <LogIn size={14} />
              <span>Operator Login</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
