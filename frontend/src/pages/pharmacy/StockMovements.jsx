// pages/pharmacy/StockMovements.jsx

import React, { useState, useEffect } from 'react'
import { stockAPI, medicinesAPI } from '../../services/api'

// Normalize API responses that may be a plain array or a paginated DRF response
const toArray = (data) => {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.results)) return data.results
  if (data && Array.isArray(data.data)) return data.data
  console.warn('Unexpected list response shape:', data)
  return []
}

export default function StockMovements() {
  const [movements, setMovements] = useState([])
  const [medicines, setMedicines] = useState([])
  const [selectedMedicine, setSelectedMedicine] = useState('')
  const [dateRange, setDateRange] = useState({
    from: '',
    to: '',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [selectedMedicine, dateRange])

  const loadData = async () => {
    try {
      setLoading(true)

      const params = {}

      if (selectedMedicine) {
        params.medicine = selectedMedicine
      }

      if (dateRange.from) {
        params.created_at__date__gte = dateRange.from
      }

      if (dateRange.to) {
        params.created_at__date__lte = dateRange.to
      }

      const [movementsData, medicinesData] = await Promise.all([
        stockAPI.list(params),
        medicinesAPI.list(),
      ])

      setMovements(toArray(movementsData))
      setMedicines(toArray(medicinesData))
    } catch (err) {
      console.error('Failed to load stock movements:', err)
      setMovements([])
      setMedicines([])
    } finally {
      setLoading(false)
    }
  }

  const getMovementIcon = (type) => {
    const icons = {
      PURCHASE: 'bi-truck',
      SALE: 'bi-cart',
      ADJUSTMENT: 'bi-pencil',
      RETURN: 'bi-arrow-return-left',
      DAMAGE: 'bi-exclamation-triangle',
    }

    return icons[type] || 'bi-arrow-left-right'
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading stock movements...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Stock Movements</h1>
          <p className="page-subtitle">
            Track all inventory transactions
          </p>
        </div>
      </div>

      {/* Filters */}
      <div
        className="card"
        style={{ marginBottom: '24px' }}
      >
        <div className="card-header">
          <h3 className="card-title">Filters</h3>
        </div>

        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Medicine
              </label>

              <select
                className="form-select"
                value={selectedMedicine}
                onChange={(e) =>
                  setSelectedMedicine(e.target.value)
                }
              >
                <option value="">
                  All Medicines
                </option>

                {medicines.map((medicine) => (
                  <option
                    key={medicine.id}
                    value={medicine.id}
                  >
                    {medicine.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                From Date
              </label>

              <input
                type="date"
                className="form-input"
                value={dateRange.from}
                onChange={(e) =>
                  setDateRange((prev) => ({
                    ...prev,
                    from: e.target.value,
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                To Date
              </label>

              <input
                type="date"
                className="form-input"
                value={dateRange.to}
                onChange={(e) =>
                  setDateRange((prev) => ({
                    ...prev,
                    to: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Movement History */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            Movement History
          </h3>
        </div>

        <div className="card-body">
          {movements.length === 0 ? (
            <div className="empty-state">
              <i
                className="bi bi-arrow-left-right"
                style={{
                  fontSize: '48px',
                  opacity: 0.5,
                }}
              ></i>

              <p className="empty-state-text">
                No stock movements found
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Medicine</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Previous</th>
                    <th>New</th>
                    <th>Reason</th>
                    <th>By</th>
                  </tr>
                </thead>

                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id}>
                      <td>
                        {new Date(
                          movement.created_at
                        ).toLocaleString()}
                      </td>

                      <td>
                        {movement.medicine_name}
                      </td>

                      <td>
                        <span className="badge badge-neutral">
                          <i
                            className={getMovementIcon(
                              movement.movement_type
                            )}
                          ></i>{' '}
                          {
                            movement.movement_type_display
                          }
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            movement.quantity > 0
                              ? 'text-success'
                              : 'text-danger'
                          }
                        >
                          {movement.quantity > 0
                            ? `+${movement.quantity}`
                            : movement.quantity}
                        </span>
                      </td>

                      <td>
                        {movement.previous_quantity}
                      </td>

                      <td>
                        {movement.new_quantity}
                      </td>

                      <td>
                        {movement.reason || '-'}
                      </td>

                      <td>
                        {movement.performed_by_name ||
                          '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}