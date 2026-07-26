import { create } from 'zustand'
import type { AppUser } from '../types'

interface AuthState {
  user: AppUser | null
  initializing: boolean
  setUser: (user: AppUser | null) => void
  setInitializing: (initializing: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initializing: true,
  setUser: (user) => set({ user }),
  setInitializing: (initializing) => set({ initializing }),
}))
