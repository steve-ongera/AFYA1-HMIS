// pages/shared/NotificationsPage.jsx
import React, { useState, useEffect } from 'react'
import { notificationsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      const data = await notificationsAPI.list()
      setNotifications(data)
    } catch (err) {
      console.error('Failed to load notifications', err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markRead(id)
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (err) {
      console.error('Failed to mark as read', err)
    }
  }

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead()
      setNotifications(notifications.map(n => ({ ...n, is_read: true })))
    } catch (err) {
      console.error('Failed to mark all as read', err)
    }
  }

  const getNotificationIcon = (type) => {
    const icons = {
      APPOINTMENT: 'bi-calendar-check',
      LOW_STOCK: 'bi-exclamation-triangle',
      FOLLOW_UP: 'bi-clock-history',
      QUEUE_CALL: 'bi-bell',
      CONSULTATION: 'bi-chat-dots',
      LAB_RESULT: 'bi-file-text',
      PRESCRIPTION: 'bi-capsule',
      CRITICAL_VALUE: 'bi-heart-pulse',
      ADMISSION: 'bi-hospital'
    }
    return icons[type] || 'bi-bell'
  }

  const filteredNotifications = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading notifications...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Stay updated with hospital activities</p>
        </div>
        <div className="page-actions">
          {notifications.some(n => !n.is_read) && (
            <button className="btn btn-secondary" onClick={markAllRead}>
              <i className="bi bi-check2-all"></i> Mark All Read
            </button>
          )}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          All <span className="tab-count">{notifications.length}</span>
        </button>
        <button className={`tab-btn ${filter === 'unread' ? 'active' : ''}`} onClick={() => setFilter('unread')}>
          Unread <span className="tab-count">{notifications.filter(n => !n.is_read).length}</span>
        </button>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-bell-slash empty-state-icon" style={{ fontSize: 48 }}></i>
          <p className="empty-state-text">No notifications to display</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className="card"
              style={{
                cursor: 'pointer',
                opacity: notification.is_read ? 0.7 : 1,
                borderLeft: `3px solid ${notification.is_urgent ? 'var(--danger)' : 'var(--primary)'}`
              }}
              onClick={() => {
                if (!notification.is_read) markAsRead(notification.id)
                if (notification.action_url) window.location.href = notification.action_url
              }}
            >
              <div className="card-body" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div className="stat-icon" style={{ flexShrink: 0 }}>
                  <i className={getNotificationIcon(notification.notification_type)} style={{ fontSize: 20 }}></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <h4 style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                      {notification.title || notification.notification_type_display}
                    </h4>
                    <span className="text-xs text-muted">{new Date(notification.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>{notification.message}</p>
                  {!notification.is_read && (
                    <span className="badge badge-primary">New</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}