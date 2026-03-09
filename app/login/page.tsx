'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: '#1D211F',
  border: '1px solid #3A403D',
}

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName,
          },
        },
      })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Account created. You can now sign in.')
        setMode('signin')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/board')
        router.refresh()
      }
    }

    setIsLoading(false)
  }

  const labelClass = 'block text-xs font-medium mb-1.5'
  const inputClass = 'w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-all'

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#1D211F' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">KBB Collective</h1>
          <p className="mt-1 text-sm font-medium" style={{ color: '#B89763' }}>
            CRM Platform
          </p>
        </div>

        <div className="rounded-2xl p-8 shadow-2xl" style={{ backgroundColor: '#252B28' }}>
          <h2 className="text-lg font-semibold text-white mb-6">
            {mode === 'signin' ? 'Sign in to your account' : 'Create an account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className={labelClass} style={{ color: '#9CA3AF' }}>Full name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Smith"
                    className={inputClass}
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#9CA3AF' }}>Company name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Smith Kitchens Ltd"
                    className={inputClass}
                    style={INPUT_STYLE}
                  />
                </div>
              </>
            )}

            <div>
              <label className={labelClass} style={{ color: '#9CA3AF' }}>Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
                style={INPUT_STYLE}
              />
            </div>

            <div>
              <label className={labelClass} style={{ color: '#9CA3AF' }}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
                style={INPUT_STYLE}
              />
            </div>

            {error && (
              <p className="text-xs rounded-lg px-3 py-2" style={{ color: '#FCA5A5', backgroundColor: '#3B1515' }}>
                {error}
              </p>
            )}
            {message && (
              <p className="text-xs rounded-lg px-3 py-2" style={{ color: '#6EE7B7', backgroundColor: '#052E16' }}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 mt-2"
              style={{ backgroundColor: '#B89763' }}
            >
              {isLoading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: '#6B7280' }}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage('') }}
              className="font-medium underline"
              style={{ color: '#B89763' }}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
