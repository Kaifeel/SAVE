import { create } from 'zustand'

function accessTokenOf(session) {
  return session?.access_token ?? session?.accessToken ?? null
}

function userOf(session) {
  return session?.user ?? null
}

export const useAuthStore = create(set => ({
  accessToken: null,
  user: null,
  authStatus: 'checking',
  setChecking: () => set({ authStatus: 'checking' }),
  setSession: session => set({
    accessToken: accessTokenOf(session),
    user: userOf(session),
    authStatus: accessTokenOf(session) ? 'authenticated' : 'unauthenticated',
  }),
  updateUser: user => set(state => ({
    user: user ?? state.user,
  })),
  clearSession: () => set({
    accessToken: null,
    user: null,
    authStatus: 'unauthenticated',
  }),
}))
