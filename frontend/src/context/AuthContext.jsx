/**
 * AFYA1 HMIS — AuthContext.jsx
 * Single context for authentication state, user info, and helpers.
 * Handles JWT access/refresh token lifecycle.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react'
import { useNavigate } from 'react-router-dom'
import api, { authAPI } from '../services/api'

// ── Context ────────────────────────────────────────────────────────────────────
const AuthContext = createContext(null)

// ── Role → dashboard path map ─────────────────────────────────────────────────
const ROLE_DASHBOARDS = {
  ADMIN:        '/admin/dashboard',
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

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const navigate = useNavigate()

  const [user, setUser]       = useState(null)       // { id, username, full_name, user_type, … }
  const [token, setToken]     = useState(null)       // JWT access token (memory only)
  const [loading, setLoading] = useState(true)       // initial auth check
  const [error, setError]     = useState(null)       // last auth error

  // Refresh timer ref — cleared on logout
  const refreshTimerRef = useRef(null)

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Attach access token to every axios request */
  const attachToken = useCallback((accessToken) => {
    if (accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    } else {
      delete api.defaults.headers.common['Authorization']
    }
  }, [])

  /** Schedule a silent token refresh 60 s before the access token expires (55 min) */
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    const MS = (55 * 60 * 1000) // 55 minutes
    refreshTimerRef.current = setTimeout(async () => {
      try {
        await silentRefresh()
      } catch {
        // silentRefresh handles logout on failure
      }
    }, MS)
  }, []) // eslint-disable-line

  /** Silently refresh access token using stored refresh token */
  const silentRefresh = useCallback(async () => {
    const refresh = localStorage.getItem('afya1_refresh')
    if (!refresh) throw new Error('No refresh token')

    const data = await authAPI.refresh(refresh)
    const newAccess = data.access

    setToken(newAccess)
    attachToken(newAccess)
    scheduleRefresh()
    return newAccess
  }, [attachToken, scheduleRefresh])

  // ── Initial auth check ────────────────────────────────────────────────────────
  useEffect(() => {
    const bootstrap = async () => {
      const refresh = localStorage.getItem('afya1_refresh')
      if (!refresh) {
        setLoading(false)
        return
      }

      try {
        // Attempt to get a fresh access token
        const data = await authAPI.refresh(refresh)
        const accessToken = data.access

        attachToken(accessToken)
        setToken(accessToken)

        // Fetch full user profile
        const userData = await authAPI.me()
        setUser(userData)
        scheduleRefresh()
      } catch {
        // Refresh token expired/invalid — clear everything
        localStorage.removeItem('afya1_refresh')
        attachToken(null)
        setUser(null)
        setToken(null)
      } finally {
        setLoading(false)
      }
    }

    bootstrap()

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [attachToken, scheduleRefresh])

  // ── Axios response interceptor — handle 401 ───────────────────────────────────
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (res) => res,
      async (err) => {
        const originalRequest = err.config

        if (
          err.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url?.includes('/auth/refresh/') &&
          !originalRequest.url?.includes('/auth/login/')
        ) {
          originalRequest._retry = true
          try {
            const newAccess = await silentRefresh()
            originalRequest.headers['Authorization'] = `Bearer ${newAccess}`
            return api(originalRequest)
          } catch {
            logout()
          }
        }

        return Promise.reject(err)
      }
    )

    return () => api.interceptors.response.eject(interceptor)
  }, [silentRefresh]) // eslint-disable-line

  // ── Auth actions ──────────────────────────────────────────────────────────────

  /**
   * Login — POST credentials, store tokens, set user, redirect to dashboard.
   * @param {string} username
   * @param {string} password
   * @returns {Promise<object>} user object
   */
  const login = useCallback(async (username, password) => {
    setError(null)
    try {
      const data = await authAPI.login(username, password)
      const { access, refresh, user: userData } = data

      // Store refresh token persistently; access token stays in memory
      localStorage.setItem('afya1_refresh', refresh)
      attachToken(access)
      setToken(access)
      setUser(userData)
      scheduleRefresh()

      // Redirect to role-appropriate dashboard
      const dashboard = ROLE_DASHBOARDS[userData.user_type] || '/'
      navigate(dashboard, { replace: true })

      return userData
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        'Login failed. Check your credentials.'
      setError(message)
      throw new Error(message)
    }
  }, [attachToken, navigate, scheduleRefresh])

  /**
   * Logout — blacklist refresh token, clear all state, redirect to /login.
   */
  const logout = useCallback(async () => {
    const refresh = localStorage.getItem('afya1_refresh')

    // Best-effort blacklist — don't block on failure
    if (refresh) {
      try {
        await authAPI.logout(refresh)
      } catch {
        // ignore
      }
    }

    // Clear timer
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)

    // Clear state
    localStorage.removeItem('afya1_refresh')
    attachToken(null)
    setToken(null)
    setUser(null)
    setError(null)

    navigate('/login', { replace: true })
  }, [attachToken, navigate])

  /**
   * Update user state (e.g. after profile edit).
   * @param {object} partial — partial user fields to merge
   */
  const updateUser = useCallback((partial) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev))
  }, [])

  /**
   * Check whether the current user has one of the given roles.
   * @param {...string} roles — role strings (e.g. 'DOCTOR', 'NURSE')
   * @returns {boolean}
   */
  const hasRole = useCallback(
    (...roles) => !!user && roles.includes(user.user_type),
    [user]
  )

  /**
   * Returns true if the user has any of the given roles OR is ADMIN.
   */
  const hasRoleOrAdmin = useCallback(
    (...roles) => hasRole('ADMIN') || hasRole(...roles),
    [hasRole]
  )

  /**
   * Get the dashboard path for the current user.
   */
  const getDashboardPath = useCallback(
    () => (user ? ROLE_DASHBOARDS[user.user_type] || '/' : '/login'),
    [user]
  )

  /**
   * Get initials from the user's full name (for avatar).
   */
  const getInitials = useCallback(() => {
    if (!user) return '?'
    const name = user.full_name || user.username || ''
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }, [user])

  // ── Context value ─────────────────────────────────────────────────────────────
  const value = {
    // State
    user,
    token,
    loading,
    error,
    isAuth: !!user && !!token,

    // Actions
    login,
    logout,
    updateUser,
    silentRefresh,

    // Helpers
    hasRole,
    hasRoleOrAdmin,
    getDashboardPath,
    getInitials,

    // Role constants (convenient access in components)
    ROLE_DASHBOARDS,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export default AuthContext