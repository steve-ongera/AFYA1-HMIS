/**
 * AFYA1 HMIS — Sidebar.jsx
 * Left sidebar with role-filtered navigation links.
 * Supports desktop collapse and mobile drawer.
 */

import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserPlus, UserCheck,
  ClipboardList, Stethoscope, FlaskConical, Pill,
  BedDouble, Siren, Baby, HeartPulse,
  CreditCard, FileText, ShieldCheck, Package,
  BarChart3, Settings, QrCode, Calendar,
  Building2, Wrench, AlertTriangle, MessageSquare,
  ChevronLeft, ChevronRight, Bell, Activity,
  Clipboard, UserCog, Boxes, TrendingUp,
  FileBadge, Truck, ClipboardCheck, BadgeDollarSign,
  ListOrdered, ScanLine, Briefcase, DoorOpen,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// ── Nav config per role ────────────────────────────────────────────────────────
// Each entry: { label, path, icon, section? }
// section changes create a labelled group header.

const NAV = {
  ADMIN: [
    { section: 'Overview' },
    { label: 'Dashboard',       path: '/admin/dashboard',        icon: LayoutDashboard },
    { section: 'Management' },
    { label: 'Users',           path: '/admin/users',            icon: Users },
    { label: 'Clinic Settings', path: '/admin/settings',         icon: Settings },
    { label: 'Audit Logs',      path: '/admin/audit-logs',       icon: Clipboard },
    { label: 'Security',        path: '/admin/security',         icon: ShieldCheck },
    { section: 'Hospital' },
    { label: 'Asset Register',  path: '/admin/assets',           icon: Boxes },
    { label: 'Reports',         path: '/admin/reports',          icon: BarChart3 },
  ],

  RECEPTIONIST: [
    { section: 'Overview' },
    { label: 'Dashboard',       path: '/receptionist/dashboard', icon: LayoutDashboard },
    { section: 'Registration' },
    { label: 'Register Patient',path: '/receptionist/register',  icon: UserPlus },
    { label: 'New Visit',       path: '/receptionist/new-visit', icon: ClipboardList },
    { label: 'Appointments',    path: '/receptionist/appointments', icon: Calendar },
    { section: 'Queue' },
    { label: 'Patient Search',  path: '/receptionist/search',    icon: UserCheck },
    { label: 'Live Queue',      path: '/receptionist/queue',     icon: ListOrdered },
  ],

  NURSE: [
    { section: 'Overview' },
    { label: 'Dashboard',       path: '/nurse/dashboard',        icon: LayoutDashboard },
    { section: 'Clinical' },
    { label: 'Triage Queue',    path: '/nurse/triage',           icon: Activity },
    { label: 'Inpatient Vitals',path: '/nurse/vitals',           icon: HeartPulse },
    { label: 'Medicine Requests',path: '/nurse/medicine-requests',icon: Pill },
    { section: 'Specialised' },
    { label: 'Maternity',       path: '/nurse/maternity',        icon: Baby },
    { label: 'MCH Clinic',      path: '/nurse/mch',              icon: UserCog },
  ],

  DOCTOR: [
    { section: 'Overview' },
    { label: 'Dashboard',       path: '/doctor/dashboard',       icon: LayoutDashboard },
    { section: 'Clinical' },
    { label: 'Consult Queue',   path: '/doctor/queue',           icon: ListOrdered },
    { label: 'My Appointments', path: '/doctor/appointments',    icon: Calendar },
    { label: 'Inpatient Rounds',path: '/doctor/inpatient',       icon: BedDouble },
    { label: 'Lab Results',     path: '/doctor/lab-results',     icon: FlaskConical },
  ],

  PHARMACIST: [
    { section: 'Overview' },
    { label: 'Dashboard',       path: '/pharmacy/dashboard',     icon: LayoutDashboard },
    { section: 'Dispensing' },
    { label: 'Prescriptions',   path: '/pharmacy/prescriptions', icon: ClipboardList },
    { label: 'OTC Sales',       path: '/pharmacy/otc',           icon: Pill },
    { section: 'Inventory' },
    { label: 'Stock',           path: '/pharmacy/stock',         icon: Boxes },
    { label: 'Stock Movements', path: '/pharmacy/movements',     icon: TrendingUp },
  ],

  LAB_TECH: [
    { section: 'Overview' },
    { label: 'Dashboard',       path: '/laboratory/dashboard',   icon: LayoutDashboard },
    { section: 'Laboratory' },
    { label: 'Lab Orders',      path: '/laboratory/orders',      icon: FlaskConical },
    { label: 'Imaging Studies', path: '/laboratory/imaging',     icon: Activity },
    { label: 'Results',         path: '/laboratory/results',     icon: FileText },
  ],

  CASHIER: [
    { section: 'Overview' },
    { label: 'Dashboard',       path: '/cashier/dashboard',      icon: LayoutDashboard },
    { section: 'Session' },
    { label: 'My Session',      path: '/cashier/session',        icon: DoorOpen },
    { label: 'Payments',        path: '/cashier/payments',       icon: CreditCard },
    { label: 'Receipts',        path: '/cashier/receipts',       icon: FileText },
    { section: 'Reports' },
    { label: 'Z-Report',        path: '/cashier/reports',        icon: BarChart3 },
  ],

  INSURANCE: [
    { section: 'Overview' },
    { label: 'Dashboard',       path: '/insurance/dashboard',    icon: LayoutDashboard },
    { section: 'Claims' },
    { label: 'Consultation',    path: '/insurance/consultation', icon: Stethoscope },
    { label: 'Pharmacy',        path: '/insurance/pharmacy',     icon: Pill },
    { label: 'Inpatient',       path: '/insurance/inpatient',    icon: BedDouble },
    { label: 'SHA Claims',      path: '/insurance/sha',          icon: ShieldCheck },
    { section: 'Reports' },
    { label: 'Claims Report',   path: '/insurance/reports',      icon: BarChart3 },
  ],

  PROCUREMENT: [
    { section: 'Overview' },
    { label: 'Dashboard',       path: '/procurement/dashboard',  icon: LayoutDashboard },
    { section: 'Procurement' },
    { label: 'Purchase Requests',path: '/procurement/requests',  icon: ClipboardList },
    { label: 'Purchase Orders', path: '/procurement/orders',     icon: Briefcase },
    { label: 'Goods Received',  path: '/procurement/grn',        icon: ClipboardCheck },
    { label: 'Suppliers',       path: '/procurement/suppliers',  icon: Building2 },
  ],

  ACCOUNTANT: [
    { section: 'Overview' },
    { label: 'Dashboard',       path: '/accountant/dashboard',   icon: LayoutDashboard },
    { section: 'eTIMS / KRA' },
    { label: 'eTIMS Invoices',  path: '/accountant/etims',       icon: FileBadge },
    { label: 'eTIMS Config',    path: '/accountant/etims-config',icon: Settings },
    { section: 'Finance' },
    { label: 'Payment Logs',    path: '/accountant/payments',    icon: BadgeDollarSign },
    { label: 'Reports',         path: '/accountant/reports',     icon: BarChart3 },
  ],

  HR: [
    { section: 'Overview' },
    { label: 'Dashboard',       path: '/hr/dashboard',           icon: LayoutDashboard },
    { section: 'Attendance' },
    { label: 'QR Codes',        path: '/hr/qr-codes',            icon: QrCode },
    { label: 'Attendance',      path: '/hr/attendance',          icon: ScanLine },
    { section: 'Leave' },
    { label: 'Leave Requests',  path: '/hr/leave',               icon: Calendar },
    { label: 'Staff List',      path: '/hr/staff',               icon: Users },
  ],
}

// ── Shared links visible to all roles ─────────────────────────────────────────
const SHARED_LINKS = [
  { label: 'Notifications', path: '/shared/notifications', icon: Bell },
  { label: 'Messages',      path: '/shared/messages',       icon: MessageSquare },
]

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) return null

  const links = NAV[user.user_type] || []

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.4)',
            zIndex: 89,
          }}
          onClick={onToggleCollapse}
        />
      )}

      <aside
        className={[
          'sidebar',
          collapsed ? 'collapsed' : '',
          mobileOpen ? 'mobile-open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="sidebar-inner">
          {links.map((item, idx) => {
            /* Section label */
            if (item.section) {
              return (
                <div key={`section-${idx}`} className="sidebar-section-label">
                  {item.section}
                </div>
              )
            }

            const Icon = item.icon
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path))

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`sidebar-link${isActive ? ' active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} className="sidebar-link-icon" />
                <span className="sidebar-link-text">{item.label}</span>
              </NavLink>
            )
          })}

          {/* Shared links */}
          <div className="sidebar-section-label" style={{ marginTop: 8 }}>
            General
          </div>
          {SHARED_LINKS.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname.startsWith(item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`sidebar-link${isActive ? ' active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} className="sidebar-link-icon" />
                <span className="sidebar-link-text">{item.label}</span>
              </NavLink>
            )
          })}
        </div>

        {/* Collapse toggle — desktop only */}
        <div className="sidebar-toggle">
          <button
            className="sidebar-toggle-btn"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>
      </aside>
    </>
  )
}