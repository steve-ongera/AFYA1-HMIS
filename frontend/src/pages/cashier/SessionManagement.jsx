// pages/cashier/SessionManagement.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { cashierAPI, paymentsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function SessionManagement() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeSession, setActiveSession] = useState(null)
  const [sessionHistory, setSessionHistory] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [closingData, setClosingData] = useState({ actual_cash: '', notes: '' })
  const [showCloseModal, setShowCloseModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [session, history, payments] = await Promise.all([
        cashierAPI.activeSession().catch(() => null),
        cashierAPI.sessions(),
        paymentsAPI.logs({ processed_by: user.id })
      ])

      const historyList = Array.isArray(history) ? history : (history?.results ?? [])
      const paymentsList = Array.isArray(payments) ? payments : (payments?.results ?? [])

      setActiveSession(session)
      setSessionHistory(historyList)
      setTransactions(paymentsList)

      if (session) {
        const expected = session.opening_balance + paymentsList.reduce((sum, p) => sum + p.amount, 0)
        setActiveSession(prev => ({ ...prev, expected_cash: expected }))
      }
    } catch (err) {
      console.error('Failed to load session data', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCloseSession = async () => {
    if (!activeSession) return
    try {
      await cashierAPI.closeSession(activeSession.id, closingData)
      navigate('/cashier/dashboard')
    } catch (err) {
      console.error('Failed to close session', err)
      alert(err.message || 'Failed to close session')
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading session data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Cashier Session Management</h1>
          <p className="page-subtitle">Manage your cashier shifts and reconcile payments</p>
        </div>
      </div>

      {activeSession ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">Active Session</h3>
            <button className="btn btn-danger" onClick={() => setShowCloseModal(true)}>Close Session</button>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item"><div className="info-label">Session ID</div><div className="info-value">{activeSession.session_id}</div></div>
              <div className="info-item"><div className="info-label">Opened At</div><div className="info-value">{new Date(activeSession.opened_at).toLocaleString()}</div></div>
              <div className="info-item"><div className="info-label">Opening Balance</div><div className="info-value">KES {activeSession.opening_balance?.toLocaleString()}</div></div>
              <div className="info-item"><div className="info-label">Expected Cash</div><div className="info-value">KES {activeSession.expected_cash?.toLocaleString()}</div></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="alert alert-warning">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <span>No active session. Please open a session before processing payments.</span>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/cashier/dashboard')}>Open Session</button>
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Today's Transactions</h3>
        </div>
        <div className="card-body">
          {transactions.length === 0 ? (
            <div className="empty-state"><p>No transactions recorded</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Time</th><th>Transaction ID</th><th>Type</th><th>Amount</th><th>Method</th></tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.created_at).toLocaleTimeString()}</td>
                      <td>{tx.transaction_id}</td>
                      <td>{tx.transaction_type_display}</td>
                      <td>KES {tx.amount.toLocaleString()}</td>
                      <td>{tx.payment_method}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 'bold' }}>
                    <td colSpan="3">Total</td>
                    <td>KES {transactions.reduce((sum, tx) => sum + tx.amount, 0).toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Session History</h3>
        </div>
        <div className="card-body">
          {sessionHistory.length === 0 ? (
            <div className="empty-state"><p>No past sessions found</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Session ID</th><th>Opened</th><th>Closed</th><th>Opening</th><th>Expected</th><th>Actual</th><th>Variance</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {sessionHistory.map((session) => (
                    <tr key={session.id}>
                      <td>{session.session_id}</td>
                      <td>{new Date(session.opened_at).toLocaleString()}</td>
                      <td>{session.closed_at ? new Date(session.closed_at).toLocaleString() : '-'}</td>
                      <td>KES {session.opening_balance?.toLocaleString()}</td>
                      <td>KES {session.expected_cash?.toLocaleString()}</td>
                      <td>KES {session.actual_cash?.toLocaleString() || '-'}</td>
                      <td>
                        {session.cash_variance !== 0 && (
                          <span className={session.cash_variance > 0 ? 'text-success' : 'text-danger'}>
                            KES {session.cash_variance?.toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td><span className={`badge ${session.status === 'CLOSED' ? 'badge-success' : 'badge-warning'}`}>{session.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCloseModal && (
        <div className="modal-overlay" onClick={() => setShowCloseModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Close Session - Reconciliation</h3>
              <button className="modal-close" onClick={() => setShowCloseModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="info-grid" style={{ marginBottom: 16 }}>
                <div className="info-item"><div className="info-label">Expected Cash</div><div className="info-value">KES {activeSession?.expected_cash?.toLocaleString()}</div></div>
              </div>
              <div className="form-group">
                <label className="form-label required">Actual Cash Count (KES)</label>
                <input
                  type="number"
                  className="form-input"
                  required
                  value={closingData.actual_cash}
                  onChange={(e) => setClosingData(prev => ({ ...prev, actual_cash: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Reconciliation Notes</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  value={closingData.notes}
                  onChange={(e) => setClosingData(prev => ({ ...prev, notes: e.target.value }))}
                ></textarea>
              </div>
              {closingData.actual_cash && (
                <div className={`alert ${parseFloat(closingData.actual_cash) !== activeSession?.expected_cash ? 'alert-warning' : 'alert-success'}`}>
                  <i className={parseFloat(closingData.actual_cash) !== activeSession?.expected_cash ? 'bi bi-exclamation-triangle-fill' : 'bi bi-check-circle-fill'}></i>
                  <span>
                    Variance: KES {(parseFloat(closingData.actual_cash) - activeSession?.expected_cash).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCloseModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCloseSession}>Confirm Close Session</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}