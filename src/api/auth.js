import { apiFetch } from './client'

const AUTH_STORAGE_KEY = 'save_auth'

export function loginWithGoogle(idToken) {
  return apiFetch('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  })
}

export function loginWithEmail(email, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function signUpWithEmail({ email, password, name, department }) {
  return apiFetch('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, department }),
  })
}

export function saveAuth(auth) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
}

export function getSavedAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearSavedAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function getAccessToken(auth) {
  return auth?.accessToken || auth?.token || auth?.jwt || null
}

export function getAuthUser(auth) {
  return auth?.user || auth?.member || auth?.data?.user || null
}
