import React, { useState } from 'react'
import { apiService } from '../../services/api'
import './AdminCreateUser.css'

const AdminCreateUser = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setName('')
    setEmail('')
    setPassword('')
    setPasswordConfirm('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedName || !trimmedEmail || !password) {
      setError('Name, email, and password are required.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== passwordConfirm) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await apiService.createUserAsAdmin(trimmedName, trimmedEmail, password)
      const createdUser = response?.user

      setSuccessMessage(
        createdUser
          ? `Created account for ${createdUser.name} (${createdUser.email}).`
          : 'User account created successfully.'
      )
      resetForm()
    } catch (createError) {
      setError(createError?.response?.data?.error || createError?.message || 'Failed to create user')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="admin-users-page">
      <div className="admin-users-panel">
        <h1>Admin: Create User</h1>
        <p>Create a new learner account. This section is restricted to administrators.</p>

        <form onSubmit={handleSubmit} className="admin-users-form">
          <label htmlFor="admin-user-name">Full Name</label>
          <input
            id="admin-user-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Jane Smith"
            required
          />

          <label htmlFor="admin-user-email">Email</label>
          <input
            id="admin-user-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="jane@example.com"
            autoComplete="email"
            required
          />

          <label htmlFor="admin-user-password">Temporary Password</label>
          <input
            id="admin-user-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            required
          />

          <label htmlFor="admin-user-password-confirm">Confirm Password</label>
          <input
            id="admin-user-password-confirm"
            type="password"
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            placeholder="Re-enter password"
            autoComplete="new-password"
            required
          />

          {error && <p className="admin-users-error" role="alert">{error}</p>}
          {successMessage && <p className="admin-users-success" role="status">{successMessage}</p>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating user...' : 'Create User'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AdminCreateUser
