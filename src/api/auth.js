import { apiFetch, refreshAuthSession } from './client'

export function loginWithGoogle(idToken) {
  return apiFetch('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  })
}

export function exchangeGoogleLogin(code) {
  return apiFetch('/auth/google/exchange', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

export function loginWithEmail(email, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function signUpWithEmail({ email, password, name, department, universityId }) {
  return apiFetch('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      name,
      department,
      university_id: universityId,
    }),
  })
}

export function refreshSession() {
  return refreshAuthSession()
}

export function logoutSession() {
  return apiFetch('/auth/logout', { method: 'POST' })
}

export function getAccessToken(auth) {
  return auth?.access_token || auth?.accessToken || auth?.token || auth?.jwt || null
}

export function getAuthUser(auth) {
  return auth?.user || auth?.member || auth?.data?.user || null
}
