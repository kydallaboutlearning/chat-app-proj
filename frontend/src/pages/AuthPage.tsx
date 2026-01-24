import { useState, useEffect } from 'react'
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
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  const canUseGoogle = Boolean(googleClientId)

  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const googleLogin = useAuthStore((s) => s.googleLogin)
  const token = useAuthStore((s) => s.token)
  const isCheckingAuth = useAuthStore((s) => s.isCheckingAuth)

  const navigate = useNavigate()

  // Navigate to chat when token is available and auth check is complete
  useEffect(() => {
    if (token && !isCheckingAuth) {
      setIsLoading(false)
      navigate('/chat')
    }
  }, [token, isCheckingAuth, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    try {
      if (isLogin) {
        await login(email, password)
        setSuccess('Logged in successfully')
      } else {
        await register(email, password, name)
        setSuccess('Account created successfully')
      }
      // Navigation will happen automatically via useEffect when token is set
    } catch (err: any) {
      let msg = 'Something went wrong. Please try again.'
      if (err?.response?.data?.error) {
        msg = err.response.data.error
      } else if (err?.message) {
        msg = err.message
      } else if (err?.code === 'ECONNABORTED' || err?.code === 'ERR_NETWORK' || err?.code === 'ERR_CONNECTION_REFUSED') {
        msg = '⚠️ Backend server is not running! Please start the backend server first. See SETUP_GUIDE.md for instructions.'
      } else if (!err?.response) {
        msg = '⚠️ Cannot connect to backend server. Make sure the backend is running on http://localhost:3001'
      }
      setError(msg)
      setIsLoading(false)
      console.error('Login error:', err)
    }
  }

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse?.credential) return
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await googleLogin(credentialResponse.credential)
      setSuccess('Logged in with Google successfully!')
      // Small delay to show success message before navigation
      setTimeout(() => {
        setIsLoading(false)
      }, 300)
      // Navigation will happen automatically via useEffect when token is set
    } catch (err: any) {
      let msg = 'Google login failed. Please try again.'
      if (err?.response?.data?.error) {
        msg = err.response.data.error
      } else if (err?.message) {
        msg = err.message
      } else if (err?.code === 'ECONNABORTED' || err?.code === 'ERR_NETWORK' || err?.code === 'ERR_CONNECTION_REFUSED') {
        msg = '⚠️ Backend server is not running! Please start the backend server first. See SETUP_GUIDE.md for instructions.'
      } else if (!err?.response) {
        msg = '⚠️ Cannot connect to backend server. Make sure the backend is running on http://localhost:3001'
      }
      setError(msg)
      setIsLoading(false)
      console.error('Google login error:', err)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-branding">
          <div className="brand-content">
            <div className="logo">
              <div className="logo-icon">💬</div>
              <span>Message</span>
            </div>

            <h1>Stay connected with instant messaging</h1>
            <p className="subtitle">Join thousands of users enjoying seamless, real-time conversations. Get started in seconds.</p>

            <div className="social-proof">
              <div className="proof-item">
                <strong>10,000+</strong>
                <span>Active users</span>
              </div>
              <div className="proof-item">
                <strong>99.9%</strong>
                <span>Uptime</span>
              </div>
              <div className="proof-item">
                <strong>24/7</strong>
                <span>Support</span>
              </div>
            </div>

            <div className="features">
              <div className="feature">
                <div className="feature-icon">⚡</div>
                <div className="feature-text">
                  <strong>Lightning fast</strong>
                  <span>Messages delivered instantly</span>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">🔒</div>
                <div className="feature-text">
                  <strong>End-to-end secure</strong>
                  <span>Your conversations are private</span>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">🌐</div>
                <div className="feature-text">
                  <strong>Works everywhere</strong>
                  <span>Desktop, mobile, anywhere</span>
                </div>
              </div>
            </div>

            <div className="testimonials">
              <div className="testimonial">
                <div className="testimonial-content">"Best chat app I've used. Clean interface and super fast!"</div>
                <div className="testimonial-author">— Sarah M., Product Manager</div>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-form-section">
          <div className="auth-form-container">
            <div className="form-header">
              <h2>{isLogin ? 'Welcome back!' : 'Create your account'}</h2>
              <p>{isLogin ? 'Sign in to continue chatting' : 'Join thousands of users. Free forever.'}</p>
            </div>

              {error ? (
                <div className="alert error" role="alert" style={{ animation: 'fadeIn 0.3s ease-in' }}>
                  {error}
                </div>
              ) : null}
              {success ? (
                <div className="alert success" role="alert" style={{ animation: 'fadeIn 0.3s ease-in' }}>
                  {success}
                </div>
              ) : null}

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
              {isLoading && (
                <div style={{ marginTop: '10px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                  Please wait...
                </div>
              )}
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

