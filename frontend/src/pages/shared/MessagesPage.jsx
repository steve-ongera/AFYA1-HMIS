// pages/shared/MessagesPage.jsx
import React, { useState, useEffect, useRef } from 'react'
import { messagingAPI, usersAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function MessagesPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [staff, setStaff] = useState([])
  const [showNewChat, setShowNewChat] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadConversations()
    loadStaff()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadConversations = async () => {
    try {
      const data = await messagingAPI.conversations()
      setConversations(data)
      if (data.length > 0 && !selectedConversation) {
        setSelectedConversation(data[0])
      }
    } catch (err) {
      console.error('Failed to load conversations', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId) => {
    try {
      const data = await messagingAPI.messages(conversationId)
      setMessages(data)
    } catch (err) {
      console.error('Failed to load messages', err)
    }
  }

  const loadStaff = async () => {
    try {
      const data = await usersAPI.list({ is_active: true })
      setStaff(data.filter(u => u.id !== user.id))
    } catch (err) {
      console.error('Failed to load staff', err)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return
    try {
      await messagingAPI.sendMessage(selectedConversation.id, { content: newMessage })
      setNewMessage('')
      await loadMessages(selectedConversation.id)
      await loadConversations()
    } catch (err) {
      console.error('Failed to send message', err)
    }
  }

  const startNewConversation = async () => {
    if (!selectedStaff) return
    try {
      const data = await messagingAPI.createConversation({ participant2: selectedStaff.id })
      setConversations([data, ...conversations])
      setSelectedConversation(data)
      setShowNewChat(false)
      setSelectedStaff(null)
    } catch (err) {
      console.error('Failed to create conversation', err)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner spinner-lg"></div>
          <span>Loading messages...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Messages</h1>
          <p className="page-subtitle">Communicate with hospital staff</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewChat(true)}>
          <i className="bi bi-plus-lg"></i> New Chat
        </button>
      </div>

      <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
        {/* Conversations List */}
        <div className="card" style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card-header">
            <h3 className="card-title">Conversations</h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <i className="bi bi-chat-dots" style={{ fontSize: 32, opacity: 0.5 }}></i>
                <p className="empty-state-text">No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`sidebar-link ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                  onClick={() => setSelectedConversation(conv)}
                  style={{ cursor: 'pointer', margin: 4 }}
                >
                  <i className="bi bi-person-circle" style={{ fontSize: 18 }}></i>
                  <span style={{ flex: 1 }}>
                    {conv.participant1_name === user.full_name ? conv.participant2_name : conv.participant1_name}
                  </span>
                  {conv.unread_count > 0 && (
                    <span className="badge badge-danger">{conv.unread_count}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        {selectedConversation ? (
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="card-header">
              <h3 className="card-title">
                {selectedConversation.participant1_name === user.full_name 
                  ? selectedConversation.participant2_name 
                  : selectedConversation.participant1_name}
              </h3>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: msg.sender === user.id ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '70%',
                      padding: '8px 12px',
                      borderRadius: 12,
                      background: msg.sender === user.id ? 'var(--primary)' : 'var(--bg)',
                      color: msg.sender === user.id ? 'white' : 'var(--text)',
                    }}
                  >
                    <div style={{ fontSize: '0.875rem' }}>{msg.content}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: 4 }}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="card-footer" style={{ display: 'flex', gap: 12 }}>
              <input
                type="text"
                className="form-input"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button className="btn btn-primary" onClick={sendMessage}>
                <i className="bi bi-send"></i> Send
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="empty-state">
              <i className="bi bi-chat-dots" style={{ fontSize: 48, opacity: 0.5 }}></i>
              <p className="empty-state-text">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="modal-overlay" onClick={() => setShowNewChat(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Start New Conversation</h3>
              <button className="modal-close" onClick={() => setShowNewChat(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Select Staff Member</label>
                <select className="form-select" value={selectedStaff?.id || ''} onChange={(e) => {
                  const staffMember = staff.find(s => s.id === parseInt(e.target.value))
                  setSelectedStaff(staffMember)
                }}>
                  <option value="">Choose a staff member...</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.user_type})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNewChat(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={startNewConversation} disabled={!selectedStaff}>
                Start Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}