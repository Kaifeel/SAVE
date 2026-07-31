import { useEffect, useRef, useState } from 'react'
import { LockKeyhole, Mail, UserRound } from 'lucide-react'

const GOOGLE_IDENTITY_SCRIPT_ID = 'google-identity-services'
const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

export default function LoginPage({
  onLogin,
  universities = [],
  googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID,
  googleLoginUri = import.meta.env.VITE_GOOGLE_LOGIN_URI
    || 'http://localhost:8080/api/v1/auth/google/redirect',
}) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [universityId, setUniversityId] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const googleButtonRef = useRef(null)

  useEffect(() => {
    if (!googleClientId) return undefined

    let disposed = false
    let script = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID)
    const renderGoogleButton = () => {
      if (disposed || !googleButtonRef.current || !window.google?.accounts?.id) return
      googleButtonRef.current.replaceChildren()
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        ux_mode: 'redirect',
        login_uri: googleLoginUri,
      })
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 320,
        locale: 'ko',
      })
    }
    const handleScriptError = () => {
      if (!disposed) setError('Google 로그인 모듈을 불러오지 못했습니다.')
    }

    if (!script) {
      script = document.createElement('script')
      script.id = GOOGLE_IDENTITY_SCRIPT_ID
      script.src = GOOGLE_IDENTITY_SCRIPT_SRC
      script.async = true
      document.head.appendChild(script)
    }

    if (window.google?.accounts?.id) {
      renderGoogleButton()
    } else {
      script.addEventListener('load', renderGoogleButton)
      script.addEventListener('error', handleScriptError)
    }

    return () => {
      disposed = true
      script?.removeEventListener('load', renderGoogleButton)
      script?.removeEventListener('error', handleScriptError)
    }
  }, [googleClientId, googleLoginUri])

  const handleSubmit = async event => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await onLogin({
        mode,
        email,
        password,
        name,
        department,
        universityId: universityId ? Number(universityId) : undefined,
      })
    } catch (requestError) {
      setError(requestError.message || '로그인에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass = 'w-full h-12 pl-11 pr-4 border border-slate-300 rounded-md bg-white text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-0 sm:px-4">
      <section className="w-full max-w-[430px] min-h-screen sm:min-h-0 sm:h-[844px] bg-white sm:shadow-2xl overflow-y-auto border-x border-slate-200 px-7 py-12 flex flex-col justify-center">
        <header className="mb-9">
          <h1 className="text-4xl font-black text-indigo-700">SAVE</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">캠퍼스 물품 대여 서비스</p>
        </header>

        <div className="grid grid-cols-2 h-11 mb-7 rounded-md bg-slate-100 p-1" role="tablist">
          {[
            ['login', '로그인'],
            ['signup', '회원가입'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => { setMode(value); setError('') }}
              className={`rounded-sm text-sm font-bold transition-colors ${
                mode === value ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {googleClientId && (
          <div className="mb-6">
            <div ref={googleButtonRef} className="flex min-h-10 justify-center" />
            <div className="my-5 flex items-center gap-3 text-xs font-semibold text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              <span>또는 이메일로 계속</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">이름</span>
                <span className="relative block">
                  <UserRound className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" aria-hidden="true" />
                  <input className={inputClass} value={name} onChange={event => setName(event.target.value)} maxLength={50} autoComplete="name" required />
                </span>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">대학교</span>
                <select
                  className="w-full h-12 px-4 border border-slate-300 rounded-md text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  value={universityId}
                  onChange={event => setUniversityId(event.target.value)}
                  required
                >
                  <option value="">대학교 선택</option>
                  {universities.map(university => (
                    <option key={university.id} value={university.id}>{university.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">학과</span>
                <input className="w-full h-12 px-4 border border-slate-300 rounded-md text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100" value={department} onChange={event => setDepartment(event.target.value)} maxLength={100} required />
              </label>
            </>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">이메일</span>
            <span className="relative block">
              <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" aria-hidden="true" />
              <input className={inputClass} type="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={100} autoComplete="email" required />
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">비밀번호</span>
            <span className="relative block">
              <LockKeyhole className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" aria-hidden="true" />
              <input className={inputClass} type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={mode === 'signup' ? 8 : undefined} maxLength={72} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required />
            </span>
          </label>

          {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}

          <button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-md bg-indigo-700 text-sm font-bold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? '처리 중...' : mode === 'signup' ? '회원가입' : '로그인'}
          </button>
        </form>
      </section>
    </main>
  )
}
