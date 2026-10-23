import React, { useState } from 'react';
import {
  Activity,
  Lock,
  User,
  Mail,
  FileText,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Globe,
  Database,
  ArrowRight,
  UserPlus,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from './LanguageSelector';

export default function LoginScreen({ onEnterDemo }) {
  const { login, register } = useAuth();
  const { t } = useLanguage();
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Sign In State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register State
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const resetFormState = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setErrorMessage(t('auth.errEnterBoth', 'Please enter both your username/email and password.'));
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await login(trimmedUser, password);
      // AuthContext will update state and App will automatically transition to dashboard
    } catch (err) {
      console.error('Login submission failed:', err);
      if (err.status === 401) {
        setErrorMessage(t('auth.err401', 'Invalid username or password. Please verify your credentials.'));
      } else if (err.status === 403) {
        setErrorMessage(t('auth.err403', 'This user account has been deactivated. Please contact an administrator.'));
      } else if (!err.status || err.message?.includes('Network') || err.message?.includes('connect')) {
        setErrorMessage(t('auth.errNetwork', 'Unable to connect to backend authentication server. Ensure the FastAPI backend is running on port 8000.'));
      } else {
        setErrorMessage(err.message || t('auth.errGenericLogin', 'An unexpected error occurred during sign-in.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const trimmedUser = regUsername.trim();
    const trimmedEmail = regEmail.trim().toLowerCase();
    const trimmedFullName = regFullName.trim();

    if (!trimmedUser || !trimmedEmail || !trimmedFullName || !regPassword || !regConfirmPassword) {
      setErrorMessage(t('auth.errCompleteAll', 'Please complete all registration fields.'));
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage(t('auth.errPasswordsMismatch', 'Passwords do not match. Please re-enter.'));
      return;
    }

    if (regPassword.length < 8) {
      setErrorMessage(t('auth.errPasswordLength', 'Password must be at least 8 characters long.'));
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await register({
        username: trimmedUser,
        email: trimmedEmail,
        full_name: trimmedFullName,
        password: regPassword,
        confirm_password: regConfirmPassword,
      });

      // On successful registration: transition to Sign In mode with prefilled username
      setUsername(trimmedUser);
      setPassword('');
      setRegPassword('');
      setRegConfirmPassword('');
      setIsRegisterMode(false);
      setSuccessMessage(
        t('auth.accountCreatedSuccess', "Account created successfully for '{username}'! You can now sign in with your credentials.", {
          username: trimmedUser,
        })
      );
    } catch (err) {
      console.error('Registration failed:', err);
      if (err.status === 409) {
        setErrorMessage(err.message || t('auth.errAlreadyRegistered', 'Username or email is already registered.'));
      } else if (err.status === 400 || err.status === 422) {
        setErrorMessage(err.message || t('auth.errInvalidDetails', 'Invalid registration details provided.'));
      } else if (!err.status || err.message?.includes('Network') || err.message?.includes('connect')) {
        setErrorMessage(t('auth.errNetwork', 'Unable to connect to backend authentication server. Ensure the FastAPI backend is running on port 8000.'));
      } else {
        setErrorMessage(err.message || t('auth.errGenericRegister', 'An error occurred during account registration.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex flex-col justify-between text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-15%] left-[20%] w-[500px] h-[500px] rounded-full bg-cyan-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[20%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="h-16 px-6 sm:px-12 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40 backdrop-blur z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-wider text-white">AAYAM</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                v0.1
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-400">
              {t('common.appTagline', 'AI-Powered Public Infrastructure Intelligence Layer')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector compact />

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-mono bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('auth.nationalRegistryAuth', 'National Registry Authentication')}</span>
          </div>

          {onEnterDemo && (
            <button
              id="btn-try-demo"
              type="button"
              onClick={onEnterDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:border-amber-400 shadow-sm transition-all cursor-pointer group"
              title={t('auth.tryDemoTooltip', 'Explore AAYAM in isolated demo mode without signing in')}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
              <span>{t('auth.tryDemoMode', 'Try Demo Mode')}</span>
              <ArrowRight className="w-3 h-3 text-amber-400/80 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </header>

      {/* Main Form Viewport */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-4">
        <div className="w-full max-w-md space-y-4">
          {/* Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 p-6 sm:p-8 backdrop-blur-xl space-y-5">
            <div className="space-y-1.5 text-center">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {isRegisterMode ? t('auth.createAccount', 'Create Common User Account') : t('auth.signIn', 'Sign in to AAYAM')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                {isRegisterMode
                  ? t('auth.createAccountDesc', 'Register as a Common User for public infrastructure intelligence and Copilot.')
                  : t('auth.signInDesc', 'Enter your credentials to access the infrastructure intelligence portal.')}
              </p>
            </div>

            {/* Success Alert */}
            {successMessage && (
              <div
                id="auth-success-alert"
                className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2.5 animate-in fade-in duration-200"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{successMessage}</div>
              </div>
            )}

            {/* Error Alert */}
            {errorMessage && (
              <div
                id="login-error-alert"
                className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in duration-200"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* LOGIN FORM */}
            {!isRegisterMode && (
              <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="input-username"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                  >
                    {t('auth.usernameOrEmail', 'Username or Email')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="input-username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={t('auth.usernamePlaceholder', 'e.g. admin or engineer')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="input-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                  >
                    {t('auth.password', 'Password')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="input-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('auth.passwordPlaceholder', 'Enter account password')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      title={showPassword ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="btn-login-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-semibold text-sm shadow-lg shadow-cyan-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('auth.authenticatingSession', 'Authenticating Session...')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('auth.signInButton', 'Sign In')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Switch to Register */}
                <div className="pt-2 text-center text-xs text-slate-400">
                  <span>{t('auth.dontHaveAccount', "Don't have an account? ")}</span>
                  <button
                    type="button"
                    id="link-toggle-register"
                    onClick={() => {
                      resetFormState();
                      setIsRegisterMode(true);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    {t('auth.registerCommonUserLink', 'Register as Common User')}
                  </button>
                </div>
              </form>
            )}

            {/* REGISTER FORM */}
            {isRegisterMode && (
              <form onSubmit={handleRegisterSubmit} noValidate className="space-y-3.5">
                <div className="space-y-1">
                  <label
                    htmlFor="input-register-username"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                  >
                    {t('auth.desiredUsername', 'Desired Username')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="input-register-username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      required
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder={t('auth.desiredUsernamePlaceholder', 'e.g. rajesh_kumar')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="input-register-email"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                  >
                    {t('auth.emailAddress', 'Email Address')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="input-register-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder={t('auth.emailPlaceholder', 'e.g. rajesh@infrastructure.gov.in')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="input-register-fullname"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                  >
                    {t('auth.fullName', 'Full Name')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <FileText className="w-4 h-4" />
                    </div>
                    <input
                      id="input-register-fullname"
                      name="full_name"
                      type="text"
                      autoComplete="name"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder={t('auth.fullNamePlaceholder', 'e.g. Rajesh Kumar')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="input-register-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                  >
                    {t('auth.passwordMinChars', 'Password (min 8 chars)')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="input-register-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder={t('auth.createPasswordPlaceholder', 'Create password (8+ characters)')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      title={showPassword ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="input-register-confirm-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                  >
                    {t('auth.confirmPassword', 'Confirm Password')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="input-register-confirm-password"
                      name="confirm_password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder={t('auth.confirmPasswordPlaceholder', 'Re-enter password')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[10px] text-slate-400 leading-snug">
                  <span className="font-semibold text-slate-300">{t('auth.publicAccessPolicyTitle', 'Public Access Policy:')}</span> {t('auth.publicAccessPolicyText', 'All self-registered accounts receive the Common User role. Note: Email verification and password recovery workflows are not implemented in this version.')}
                </div>

                <button
                  id="btn-register-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('auth.creatingAccount', 'Creating Account...')}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>{t('auth.registerCommonUserButton', 'Register Common User Account')}</span>
                    </>
                  )}
                </button>

                {/* Switch to Login */}
                <div className="pt-2 text-center text-xs text-slate-400">
                  <span>{t('auth.alreadyHaveAccount', 'Already have an account? ')}</span>
                  <button
                    type="button"
                    id="link-toggle-login"
                    onClick={() => {
                      resetFormState();
                      setIsRegisterMode(false);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    {t('auth.signInLink', 'Sign In')}
                  </button>
                </div>
              </form>
            )}

            {/* Role Guidance Box */}
            <div className="pt-3 border-t border-slate-800 space-y-2 text-[11px] text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-slate-400 block">
                {t('auth.platformAccessControl', 'Platform Access Control')}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-cyan-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{t('auth.administrator', 'Administrator')}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {t('auth.adminRoleDesc', 'Onboard assets, log audits, and sign off outcomes (Admin CLI setup only).')}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-300">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{t('auth.commonUser', 'Common User')}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {t('auth.commonUserRoleDesc', 'Public registry reads, GIS maps, Digital Heartbeat, and Copilot.')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-900 bg-slate-950/60">
        {t('auth.footerSecurity', 'AAYAM Infrastructure Intelligence • Role-Based Access Control Protected')}
      </footer>
    </div>
  );
}
