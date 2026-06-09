/**
 * AFYA1 HMIS — Navbar.jsx
 * Top navigation bar — role-aware, notification bell, user menu.
 */

import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity, Bell, ChevronDown, LogOut, Menu,
  Settings, User, X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { notificationsAPI } from '../services/api'

// ── Role display names ─────────────────────────────────────────────────────────
const ROLE_LABELS = {
  ADMIN:        'Administrator',
  DOCTOR:       'Doctor',
  NURSE:        'Nurse',
  RECEPTIONIST: 'Receptionist',
  PHARMACIST:   'Pharmacist',
  LAB_TECH:     'Lab Technician',
  CASHIER:      'Cashier',
  INSURANCE:    'Claims Officer',
  PROCUREMENT:  'Procurement Officer',
  ACCOUNTANT:   'Accountant',
  HR:           'HR Officer',
}

// ── Profile path per role ──────────────────────────────────────────────────────
const PROFILE_PATHS = {
  ADMIN:        '/admin/settings',
  DOCTOR:       '/doctor/dashboard',
  NURSE:        '/nurse/dashboard',
  RECEPTIONIST: '/receptionist/dashboard',
  PHARMACIST:   '/pharmacy/dashboard',
  LAB_TECH:     '/laboratory/dashboard',
  CASHIER:      '/cashier/dashboard',
  INSURANCE:    '/insurance/dashboard',
  PROCUREMENT:  '/procurement/dashboard',
  ACCOUNTANT:   '/accountant/dashboard',
  HR:           '/hr/dashboard',
}

export default function Navbar({ onToggleSidebar, sidebarOpen }) {
  const { user, logout, getInitials, getDashboardPath } = useAuth()
  const navigate = useNavigate()

  const [dropdownOpen, setDropdownOpen]   = useState(false)
  const [unreadCount, setUnreadCount]     = useState(0)
  const [currentTime, setCurrentTime]     = useState(new Date())

  const dropdownRef = useRef(null)

  // ── Clock ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // ── Notification count ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const fetchCount = async () => {
      try {
        const data = await notificationsAPI.unreadCount()
        setUnreadCount(data.unread_count || 0)
      } catch {
        // silent
      }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 60000) // poll every minute
    return () => clearInterval(interval)
  }, [user])

  // ── Close dropdown on outside click ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const formattedTime = currentTime.toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  const formattedDate = currentTime.toLocaleDateString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const handleLogout = async () => {
    setDropdownOpen(false)
    await logout()
  }

  const goProfile = () => {
    setDropdownOpen(false)
    navigate(PROFILE_PATHS[user?.user_type] || '/')
  }

  const goSettings = () => {
    setDropdownOpen(false)
    navigate('/admin/settings')
  }

  if (!user) return null

  return (
    <header className="navbar">
      {/* ── Hamburger (mobile) ── */}
      <button
        className="navbar-hamburger"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* ── Logo ── */}
      <Link to={getDashboardPath()} className="navbar-logo">
        <div className="navbar-logo-mark">
          <Activity size={18} />
        </div>
        <div>
          <span className="navbar-logo-text">AFYA1 HMIS</span>
          <span className="navbar-logo-sub">South B Hospital</span>
        </div>
      </Link>

      <div className="navbar-spacer" />

      {/* ── Centre — date/time ── */}
      <div className="navbar-center">
        <span>{formattedDate}</span>
        <span style={{ color: 'var(--border-strong)' }}>·</span>
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
          {formattedTime}
        </span>
      </div>

      <div className="navbar-spacer" />

      {/* ── Actions ── */}
      <div className="navbar-actions">
        {/* Notification bell */}
        <button
          className="navbar-icon-btn"
          onClick={() => navigate('/shared/notifications')}
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell size={16} />
          {unreadCount > 0 && <span className="badge-dot" />}
        </button>

        {/* User menu */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            className="navbar-user"
            onClick={() => setDropdownOpen((o) => !o)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="navbar-avatar">{getInitials()}</div>
            <div className="navbar-user-info">
              <div className="navbar-user-name">
                {user.full_name || user.username}
              </div>
              <div className="navbar-user-role">
                {ROLE_LABELS[user.user_type] || user.user_type}
              </div>
            </div>
            <ChevronDown
              size={14}
              style={{
                color: 'var(--text-muted)',
                transform: dropdownOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.18s ease',
              }}
            />
          </button>

          {dropdownOpen && (
            <div className="navbar-dropdown">
              {/* User info header */}
              <div
                style={{
                  padding: '8px 12px 6px',
                  borderBottom: '1px solid var(--border)',
                  marginBottom: 4,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>
                  {user.full_name || user.username}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {user.email || ''}
                </div>
                <span
                  className={`badge badge-role-${user.user_type}`}
                  style={{ marginTop: 4 }}
                >
                  {ROLE_LABELS[user.user_type] || user.user_type}
                </span>
              </div>

              <button className="navbar-dropdown-item" onClick={goProfile}>
                <User size={14} />
                My Profile
              </button>

              {user.user_type === 'ADMIN' && (
                <button className="navbar-dropdown-item" onClick={goSettings}>
                  <Settings size={14} />
                  System Settings
                </button>
              )}

              <div className="navbar-dropdown-divider" />

              <button className="navbar-dropdown-item danger" onClick={handleLogout}>
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}