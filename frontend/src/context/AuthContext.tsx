import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import api from '../lib/api'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  onboardingCompleted: boolean
  isAdmin: boolean
  refreshOnboarding: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: Error | null; onboardingCompleted: boolean }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [onboardingCompleted, setOnboardingCompleted] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const initialLoadDone = useRef(false)

  // Returns the current onboardingCompleted value so callers can act on it immediately
  const fetchOnboardingStatus = async (): Promise<boolean> => {
    try {
      const res = await api.get('/profile')
      const data = res.data.data
      const completed = data?.onboarding_completed ?? false
      const admin = data?.role === 'admin'
      setOnboardingCompleted(completed)
      setIsAdmin(admin)
      return completed
    } catch {
      setOnboardingCompleted(false)
      setIsAdmin(false)
      return false
    }
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      if (data.session?.user) {
        await fetchOnboardingStatus()
      } else {
        setOnboardingCompleted(false)
        setIsAdmin(false)
      }
      initialLoadDone.current = true
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      setSession(session)
      setUser(session?.user ?? null)

      if (!initialLoadDone.current) return

      if (event === 'SIGNED_OUT') {
        setOnboardingCompleted(false)
        setIsAdmin(false)
      }
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
    // Hold loading=true so AuthRedirect shows a spinner instead of redirecting
    // to /onboarding while user is set but onboardingCompleted is still false.
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoading(false)
      return { error: new Error(error.message), onboardingCompleted: false }
    }
    // Fetch profile BEFORE clearing loading — AuthRedirect won't act until this resolves
    const completed = await fetchOnboardingStatus()
    setLoading(false)
    return { error: null, onboardingCompleted: completed }
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
    <AuthContext.Provider value={{ user, session, loading, onboardingCompleted, isAdmin, refreshOnboarding, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
