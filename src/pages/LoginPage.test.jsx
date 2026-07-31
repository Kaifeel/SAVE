import { render, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import LoginPage from './LoginPage'

afterEach(() => {
  delete window.google
  document.getElementById('google-identity-services')?.remove()
  vi.restoreAllMocks()
})

it('configures Google Identity Services for redirect login', async () => {
  const initialize = vi.fn()
  const renderButton = vi.fn()
  window.google = {
    accounts: {
      id: { initialize, renderButton },
    },
  }

  render(
    <LoginPage
      onLogin={vi.fn()}
      googleClientId="web-client.apps.googleusercontent.com"
      googleLoginUri="http://localhost:8080/api/v1/auth/google/redirect"
    />,
  )

  await waitFor(() => expect(initialize).toHaveBeenCalledWith({
    client_id: 'web-client.apps.googleusercontent.com',
    ux_mode: 'redirect',
    login_uri: 'http://localhost:8080/api/v1/auth/google/redirect',
  }))
  expect(renderButton).toHaveBeenCalled()
})
