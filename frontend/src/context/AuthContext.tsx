import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import api from '../lib/api'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  onboardingCompleted: boolean
  refreshOnboarding: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [onboardingCompleted, setOnboardingCompleted] = useState(false)
  const initialLoadDone = useRef(false)

  const fetchOnboardingStatus = async () => {
    try {
      const res = await api.get('/profile')
      setOnboardingCompleted(res.data.data?.onboarding_completed ?? false)
    } catch {
      setOnboardingCompleted(false)
    }
  }

  useEffect(() => {
    let mounted = true

    // Initial session check — covers page reload and existing sessions
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      if (data.session?.user) {
        await fetchOnboardingStatus()
      } else {
        setOnboardingCompleted(false)
      }
      initialLoadDone.current = true
      setLoading(false)
    })

    // Auth state changes (explicit sign-in / sign-out / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      setSession(session)
      setUser(session?.user ?? null)

      // INITIAL_SESSION is handled by getSession() above
      if (!initialLoadDone.current) return

      if (event === 'SIGNED_IN' && session?.user) {
        await fetchOnboardingStatus()
      } else if (event === 'SIGNED_OUT') {
        setOnboardingCompleted(false)
      }
      // TOKEN_REFRESHED, USER_UPDATED — no profile re-fetch needed
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const refreshOnboarding = async () => {
    await fetchOnboardingStatus()
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? new Error(error.message) : null }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return { error: error ? new Error(error.message) : null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, onboardingCompleted, refreshOnboarding, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
