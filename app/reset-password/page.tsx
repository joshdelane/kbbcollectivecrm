'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: '#1D211F',
  border: '1px solid #3A403D',
}

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const inputClass = 'w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-all'
  const labelClass = 'block text-xs font-medium mb-1.5'

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      setError('Invalid or expired reset link. Please request a new one.')
      return
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setError('Invalid or expired reset link. Please request a new one.')
      } else {
        setIsReady(true)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setIsLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      setMessage('Password updated. Redirecting...')
      setTimeout(() => router.push('/board'), 1500)
    }
  }

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
          <h2 className="text-lg font-semibold text-white mb-6">Set a new password</h2>

          {!isReady && !error ? (
            <p className="text-sm text-center" style={{ color: '#6B7280' }}>Verifying link...</p>
          ) : isReady ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelClass} style={{ color: '#9CA3AF' }}>New password</label>
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
              <div>
                <label className={labelClass} style={{ color: '#9CA3AF' }}>Confirm password</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
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
                {isLoading ? 'Please wait...' : 'Update password'}
              </button>
            </form>
          ) : (
            <>
              {error && (
                <p className="text-xs rounded-lg px-3 py-2 mb-4" style={{ color: '#FCA5A5', backgroundColor: '#3B1515' }}>
                  {error}
                </p>
              )}
              <button
                onClick={() => router.push('/login')}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#B89763' }}
              >
                Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  )
}
