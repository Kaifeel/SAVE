import { beforeEach, expect, it } from 'vitest'
import { useAuthStore } from './authStore.js'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  useAuthStore.getState().clearSession()
  useAuthStore.getState().setChecking()
})

it('keeps the authenticated session only in memory', () => {
  const user = {
    id: 1,
    name: '학생',
    department: '컴퓨터공학과',
    university_id: 1,
  }

  useAuthStore.getState().setSession({ access_token: 'jwt', user })

  expect(useAuthStore.getState()).toMatchObject({
    accessToken: 'jwt',
    user,
    authStatus: 'authenticated',
  })
  expect(localStorage).toHaveLength(0)
  expect(sessionStorage).toHaveLength(0)
})

it('updates the current profile without replacing the access token', () => {
  useAuthStore.getState().setSession({
    access_token: 'jwt',
    user: { id: 1, department: null },
  })

  useAuthStore.getState().updateUser({ id: 1, department: '컴퓨터공학과' })

  expect(useAuthStore.getState()).toMatchObject({
    accessToken: 'jwt',
    user: { id: 1, department: '컴퓨터공학과' },
  })
})
