import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '../store/authStore'

import '../assets/styles/auth.css'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  const canUseGoogle = Boolean(googleClientId)

  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const googleLogin = useAuthStore((s) => s.googleLogin)

  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await register(email, password, name)
      }
      navigate('/chat')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse?.credential) return
    await googleLogin(credentialResponse.credential)
    navigate('/chat')
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-branding">
          <div className="brand-content">
            <div className="logo">
              <img src="/vite.svg" alt="Chat App" />
              <span>Chat App</span>
            </div>

            <h1>Connect instantly with anyone, anywhere</h1>
            <p>Real-time messaging with a clean, modern UI.</p>

            <div className="social-proof">
              <p>
                <strong>10,000+</strong> active users
              </p>
            </div>

            <div className="features">
              <div className="feature">
                <span className="icon">⚡</span>
                <span>Real-time messaging</span>
              </div>
              <div className="feature">
                <span className="icon">🔒</span>
                <span>Secure by design</span>
              </div>
              <div className="feature">
                <span className="icon">🧠</span>
                <span>Ready for AI upgrades</span>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-form-section">
          <div className="auth-form-container">
            <div className="form-header">
              <h2>{isLogin ? 'Welcome back' : 'Create account'}</h2>
              <p>{isLogin ? 'Sign in to continue' : 'Get started in under a minute'}</p>
            </div>

            <div className="google-auth">
              {canUseGoogle ? (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => null}
                  theme="outline"
                  size="large"
                  width="100%"
                  text={isLogin ? 'signin_with' : 'signup_with'}
                />
              ) : (
                <button className="submit-btn" type="button" onClick={() => null}>
                  Set VITE_GOOGLE_CLIENT_ID to enable Google Sign-In
                </button>
              )}
            </div>

            <div className="divider">
              <span>or continue with email</span>
            </div>

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required={!isLogin}
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="auth-switch">
              {isLogin ? (
                <p>
                  Don&apos;t have an account? <button onClick={() => setIsLogin(false)}>Sign up</button>
                </p>
              ) : (
                <p>
                  Already have an account? <button onClick={() => setIsLogin(true)}>Sign in</button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

