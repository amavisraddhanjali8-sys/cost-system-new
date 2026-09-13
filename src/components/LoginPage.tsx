import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Shield,
  X,
  KeyRound,
  Mail,
  Send,
  Loader2,
  Check,
  Sun,
  Moon,
  Sparkles,
  Database,
  Clock
} from 'lucide-react';
import { AppUser, AccountRequest, CompanyDetails, UserRole } from '../types';
import { googleSignIn, setCachedAccessToken } from '../services/firebaseAuth';
import { gmailService } from '../services/gmailService';
import { getStoredThemeMode, setStoredThemeMode, ThemeMode } from '../services/themeService';

interface LoginPageProps {
  companyDetails: CompanyDetails;
  users: AppUser[];
  onLogin: (user: AppUser, source?: 'password' | 'google') => void;
  onRequestAccount: (request: Omit<AccountRequest, 'id' | 'submittedAt' | 'status'>) => void;
  onUpdateUserPassword?: (employeeIdOrEmail: string, newPassword: string) => Promise<boolean> | boolean;
  onRegisterGoogleUser?: (userData: AppUser) => AppUser;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  companyDetails,
  users,
  onLogin,
  onRequestAccount,
  onUpdateUserPassword,
  onRegisterGoogleUser
}) => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Theme & Live Time State
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => getStoredThemeMode());
  const [currentTime, setCurrentTime] = useState(() => new Date());

  // Modal states
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Forgot Password / Recovery States
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySuccessMessage, setRecoverySuccessMessage] = useState<string | null>(null);
  const [recoveryErrorMessage, setRecoveryErrorMessage] = useState<string | null>(null);
  const [generatedTempPass, setGeneratedTempPass] = useState<string | null>(null);

  // Request Account Form State
  const [reqEmpId, setReqEmpId] = useState('');
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqDepartment, setReqDepartment] = useState('Procurement');
  const [reqRole, setReqRole] = useState<UserRole>('PROJECT_MANAGER');
  const [reqReason, setReqReason] = useState('');

  // Clock tick & Theme synchronization
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const handleThemeEvent = () => setCurrentTheme(getStoredThemeMode());
    window.addEventListener('fxtt-theme-changed', handleThemeEvent);
    return () => {
      clearInterval(timer);
      window.removeEventListener('fxtt-theme-changed', handleThemeEvent);
    };
  }, []);

  const handleToggleTheme = () => {
    const next: ThemeMode = currentTheme === 'dark' ? 'light' : 'dark';
    setCurrentTheme(next);
    setStoredThemeMode(next);
  };

  // Dynamic Time-Based Greetings
  const getGreetingData = () => {
    const hours = currentTime.getHours();
    if (hours >= 5 && hours < 12) {
      return {
        salutation: 'Good morning',
        shift: 'Day Shift (Morning)',
      };
    } else if (hours >= 12 && hours < 17) {
      return {
        salutation: 'Good afternoon',
        shift: 'Day Shift (Afternoon)',
      };
    } else if (hours >= 17 && hours < 22) {
      return {
        salutation: 'Good evening',
        shift: 'Swing Shift (Evening)',
      };
    } else {
      return {
        salutation: 'Good night',
        shift: 'Night Shift',
      };
    }
  };

  const greeting = getGreetingData();

  // Password-based login submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const trimmedId = employeeId.trim();
    const trimmedPw = password.trim();

    if (!trimmedId) {
      setErrorMessage('Please enter your email address or Employee ID.');
      return;
    }

    // Match by employeeId or email (case insensitive)
    const matchedUser = users.find(
      u => u.employeeId.toUpperCase() === trimmedId.toUpperCase() || u.email.toLowerCase() === trimmedId.toLowerCase()
    );

    if (!matchedUser) {
      setErrorMessage('Account not found. Click "Sign up" below or verify your credentials.');
      return;
    }

    if (matchedUser.status === 'Inactive') {
      setErrorMessage('This user account is currently deactivated. Please contact an Administrator.');
      return;
    }

    // Check password if set
    if (matchedUser.password && matchedUser.password !== trimmedPw) {
      setErrorMessage('Incorrect password. Click "Forgot password?" to reset.');
      return;
    }

    onLogin(matchedUser, 'password');
  };

  // Sign In With Google Handler
  const handleGoogleSignInClick = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setIsGoogleLoading(true);

    try {
      const result = await googleSignIn();
      if (!result || !result.user) {
        throw new Error('Google Sign-In was cancelled or did not return user credentials.');
      }

      const { user: gUser, accessToken } = result;
      const userEmail = gUser.email || '';
      const displayName = gUser.displayName || userEmail.split('@')[0] || 'Enterprise User';

      // Look for existing user by email
      let matchedUser = users.find(
        u => u.email.toLowerCase() === userEmail.toLowerCase() ||
             (u.googleEmail && u.googleEmail.toLowerCase() === userEmail.toLowerCase())
      );

      // If user doesn't exist, automatically provision their profile
      if (!matchedUser) {
        const generatedEmpId = `EMP-G-${Math.floor(1000 + Math.random() * 9000)}`;
        const newUser: AppUser = {
          id: `user-g-${Date.now()}`,
          employeeId: generatedEmpId,
          name: displayName,
          email: userEmail,
          role: 'ADMIN',
          department: 'Executive Management',
          password: 'gpass_' + Math.random().toString(36).substring(2, 8),
          status: 'Active',
          createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
          lastLogin: new Date().toISOString().replace('T', ' ').slice(0, 19),
          avatarUrl: gUser.photoURL || undefined,
          authProvider: 'google',
          googleEmail: userEmail
        };

        if (onRegisterGoogleUser) {
          matchedUser = onRegisterGoogleUser(newUser);
        } else {
          matchedUser = newUser;
        }
      }

      // Cache token for Gmail integration
      if (accessToken) {
        setCachedAccessToken(accessToken);
      }

      // Automated login email alert via Gmail API
      try {
        await gmailService.sendLoginNotificationEmail({
          recipientEmail: userEmail,
          userName: displayName,
          employeeId: matchedUser.employeeId,
          role: matchedUser.role,
          loginTime: new Date().toLocaleString(),
          ipAddress: '192.168.1.102 (Google OAuth Authenticated)',
          companyName: companyDetails.name || 'Cost and Planning Database System'
        });
      } catch (e) {
        console.warn('Silent Gmail login alert skipped:', e);
      }

      onLogin(matchedUser, 'google');
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      setErrorMessage(
        err.message || 'Failed to sign in with Google. Ensure popups are allowed in your browser.'
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Submit Account Request
  const handleAccountRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqEmpId.trim() || !reqName.trim() || !reqEmail.trim()) return;

    onRequestAccount({
      employeeId: reqEmpId.trim().toUpperCase(),
      name: reqName.trim(),
      email: reqEmail.trim(),
      department: reqDepartment.trim(),
      requestedRole: reqRole,
      reason: reqReason.trim()
    });

    setRequestSubmitted(true);
    setTimeout(() => {
      setRequestSubmitted(false);
      setIsRequestModalOpen(false);
      setInfoMessage('Your request has been submitted for Administrator review.');
    }, 2000);
  };

  // Execute Password Recovery via Gmail API
  const handleExecuteAccountRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryErrorMessage(null);
    setRecoverySuccessMessage(null);
    setGeneratedTempPass(null);

    const query = recoveryIdentifier.trim().toLowerCase();
    if (!query) {
      setRecoveryErrorMessage('Please provide an Employee ID or email address.');
      return;
    }

    const targetUser = users.find(
      u => u.employeeId.toLowerCase() === query || u.email.toLowerCase() === query
    );

    if (!targetUser) {
      setRecoveryErrorMessage('No registered user was found matching that identification.');
      return;
    }

    setIsRecovering(true);

    try {
      const tempPass = 'fxtt_' + Math.random().toString(36).substring(2, 7) + '!9';

      if (onUpdateUserPassword) {
        await onUpdateUserPassword(targetUser.id, tempPass);
      }

      setGeneratedTempPass(tempPass);

      const sendResult = await gmailService.sendPasswordRecoveryEmail({
        recipientEmail: targetUser.email,
        userName: targetUser.name,
        employeeId: targetUser.employeeId,
        tempPassword: tempPass,
        companyName: companyDetails.name || 'Cost and Planning Database System'
      });

      if (sendResult.success) {
        setRecoverySuccessMessage(
          `Temporary password sent to ${targetUser.email} via Gmail. You can also use it immediately below to log in.`
        );
      } else {
        setRecoverySuccessMessage(
          `Temporary password generated successfully (${tempPass}). Note: Gmail dispatch reported: ${sendResult.error || 'Check Gmail permissions'}. You may use the temporary password directly to sign in.`
        );
      }
    } catch (err: any) {
      console.error('Account recovery error:', err);
      setRecoveryErrorMessage(`Failed to complete recovery: ${err?.message || 'Internal error'}`);
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans">
      
      {/* =========================================================================
          LEFT SIDE: PURPLE, PINK & LIGHT BLUE GRADIENT + DIAGONAL PILLS
          Matching the requested purple, pink, and light blue palette (no orange)
          ========================================================================= */}
      <div 
        className="w-full lg:w-7/12 xl:w-7/12 min-h-[460px] lg:min-h-screen flex flex-col justify-between p-8 sm:p-12 lg:p-16 relative overflow-hidden text-white"
        style={{
          background: 'linear-gradient(130deg, #4f46e5 0%, #6366f1 22%, #7c3aed 48%, #a855f7 72%, #ec4899 100%)'
        }}
      >
        {/* Soft Background Radial Orb in Top Right (Light Blue & Pink) */}
        <div 
          className="absolute -top-12 -right-12 w-96 h-96 rounded-full pointer-events-none opacity-40 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.55) 0%, rgba(244, 114, 182, 0.45) 45%, rgba(124, 58, 237, 0) 75%)'
          }}
        />

        {/* Diagonal Dynamic Gradient Capsules in Lower Left (Purple, Pink & Light Blue - No Orange) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <svg
            viewBox="0 0 900 800"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full object-cover"
            preserveAspectRatio="xMinYMax slice"
          >
            <defs>
              {/* Light Blue to Pink to Purple Gradient */}
              <linearGradient id="pillGrad1" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#f472b6" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>

              {/* Sky Blue to Deep Pink to Violet Gradient */}
              <linearGradient id="pillGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="45%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>

              {/* Cyan / Light Blue to Soft Pink */}
              <linearGradient id="pillGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7dd3fc" />
                <stop offset="55%" stopColor="#f472b6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>

              {/* Deep Violet & Fuchsia Pill */}
              <linearGradient id="pillGradPurple" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#d946ef" stopOpacity="0.45" />
              </linearGradient>

              {/* Soft Light Blue & Pink Glowing Orb */}
              <radialGradient id="softSunOrb" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#f472b6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Glowing orb behind pills */}
            <circle cx="580" cy="280" r="140" fill="url(#softSunOrb)" />

            {/* Diagonal angled pills group: rotated ~-38 degrees */}
            <g transform="rotate(-38 240 680)">
              {/* Background deeper violet-fuchsia pills */}
              <rect x="-140" y="560" width="360" height="74" rx="37" fill="url(#pillGradPurple)" />
              <rect x="80" y="470" width="320" height="66" rx="33" fill="url(#pillGradPurple)" />
              <rect x="260" y="560" width="280" height="70" rx="35" fill="url(#pillGradPurple)" />

              {/* Main vibrant light blue, pink & purple pills */}
              {/* Lower-left thick pill */}
              <rect x="-100" y="660" width="460" height="84" rx="42" fill="url(#pillGrad1)" />
              
              {/* Central thick pill */}
              <rect x="160" y="630" width="420" height="80" rx="40" fill="url(#pillGrad2)" />
              
              {/* Mid thick pill */}
              <rect x="10" y="510" width="370" height="72" rx="36" fill="url(#pillGrad3)" />
              
              {/* Right mid pill */}
              <rect x="230" y="500" width="340" height="66" rx="33" fill="url(#pillGrad2)" />

              {/* Thin light blue, pink & soft purple speed lines */}
              <rect x="-50" y="620" width="240" height="12" rx="6" fill="#38bdf8" />
              <rect x="50" y="450" width="280" height="12" rx="6" fill="#f472b6" />
              <rect x="150" y="400" width="350" height="11" rx="5.5" fill="#7dd3fc" />
              <rect x="340" y="450" width="200" height="10" rx="5" fill="#ec4899" />
              <rect x="-20" y="740" width="190" height="10" rx="5" fill="#c084fc" />
              <rect x="420" y="580" width="220" height="10" rx="5" fill="#38bdf8" />
              <rect x="280" y="370" width="160" height="9" rx="4.5" fill="#f472b6" />
            </g>
          </svg>
        </div>

        {/* Top bar on Left: Company Brand */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            {companyDetails.logoUrl ? (
              <img
                src={companyDetails.logoUrl}
                alt={companyDetails.name}
                className="h-9 max-w-[160px] object-contain drop-shadow"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                <Database className="w-4 h-4 text-white" />
              </div>
            )}
            <div>
              <span className="text-sm sm:text-base font-bold tracking-tight text-white block leading-tight">
                {companyDetails.name || 'Enterprise Systems'}
              </span>
              <span className="text-[10px] tracking-wider text-white/70 uppercase font-mono">
                Industrial Division
              </span>
            </div>
          </div>
        </div>

        {/* Center Content: Dynamic Greeting & Welcome to the System */}
        <div className="relative z-10 my-auto py-12 max-w-xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
            {greeting.salutation}!
          </h1>

          <div className="mt-3">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-snug">
              Welcome to Cost and Planning Database System
            </h2>
          </div>

          <p className="mt-4 text-white/85 text-sm sm:text-base font-normal leading-relaxed max-w-lg">
            Streamlined multi-phase cost estimation, dynamic profit margins, outsourced vendor rates, and enterprise project schedule management.
          </p>
        </div>

        {/* Footer info on left */}
        <div className="relative z-10 pt-4 text-xs text-white/60 border-t border-white/10">
          <span>Cost and Planning Database System &copy; {new Date().getFullYear()}</span>
        </div>
      </div>

      {/* =========================================================================
          RIGHT SIDE: USER LOGIN FORM (Matching screenshot's clean pill UI)
          ========================================================================= */}
      <div className="w-full lg:w-5/12 xl:w-5/12 min-h-screen flex flex-col justify-between p-8 sm:p-12 lg:p-14 bg-white dark:bg-[#0c101d] overflow-y-auto">
        
        {/* Top Bar on Right: Dark Mode Toggle */}
        <div className="flex items-center justify-end w-full">
          <button
            type="button"
            onClick={handleToggleTheme}
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Toggle Day/Night Shift theme"
          >
            {currentTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>

        {/* Center Container: Exact Layout from Screenshot */}
        <div className="w-full max-w-[340px] sm:max-w-[360px] mx-auto my-auto">
          
          {/* USER LOGIN Header in uppercase purple */}
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold tracking-wider text-[#6366f1] dark:text-[#818cf8] uppercase">
              USER LOGIN
            </h2>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500 dark:text-red-400" />
              <span className="break-words leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Info Message */}
          {infoMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs flex items-start gap-2 animate-in fade-in">
              <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-blue-500 dark:text-blue-400" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Standard Credentials Form with Lavender Pill Inputs */}
          <form className="space-y-4" onSubmit={handleLoginSubmit}>
            
            {/* Username / Employee ID Input Pill */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8b5cf6] dark:text-[#a78bfa]">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                id="input-login-identity"
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="User / Employee ID / Email"
                required
                className="w-full pl-11 pr-4 py-3 rounded-full bg-[#ede9fe]/80 dark:bg-[#1e1b4b]/50 border border-transparent dark:border-indigo-900/40 text-slate-800 dark:text-white placeholder:text-indigo-400/80 dark:placeholder:text-indigo-400/50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/40 transition-all"
              />
            </div>

            {/* Password Input Pill */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8b5cf6] dark:text-[#a78bfa]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="input-login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full pl-11 pr-11 py-3 rounded-full bg-[#ede9fe]/80 dark:bg-[#1e1b4b]/50 border border-transparent dark:border-indigo-900/40 text-slate-800 dark:text-white placeholder:text-indigo-400/80 dark:placeholder:text-indigo-400/50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/40 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#8b5cf6] hover:text-[#7c3aed] transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Remember & Forgot Password Row (Matching the screenshot) */}
            <div className="flex items-center justify-between text-xs px-1 pt-1">
              {/* Circular purple checkmark toggle */}
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer select-none transition-colors"
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                    rememberMe
                      ? 'bg-[#6366f1] text-white'
                      : 'border border-slate-300 dark:border-slate-600 bg-transparent'
                  }`}
                >
                  {rememberMe && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <span className="text-[11px] sm:text-xs">Remember</span>
              </button>

              {/* Forgot password link */}
              <button
                type="button"
                onClick={() => {
                  setRecoveryErrorMessage(null);
                  setRecoverySuccessMessage(null);
                  setGeneratedTempPass(null);
                  setRecoveryIdentifier(employeeId || '');
                  setIsForgotPasswordModalOpen(true);
                }}
                className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 hover:text-[#6366f1] dark:hover:text-[#818cf8] transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Centered LOGIN Gradient Pill Button (Purple, Pink & Light Blue) */}
            <div className="pt-4 flex justify-center">
              <button
                id="btn-login-submit"
                type="submit"
                className="px-10 py-2.5 rounded-full text-xs sm:text-sm font-bold tracking-wider text-white uppercase shadow-md hover:shadow-lg transition-all transform active:scale-95 cursor-pointer"
                style={{
                  background: 'linear-gradient(90deg, #8b5cf6 0%, #ec4899 50%, #38bdf8 100%)'
                }}
              >
                LOGIN
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-[#0c101d] px-2.5 text-[10px] text-slate-400 uppercase tracking-wider">
                or
              </span>
            </div>

            {/* Sign in with Google Pill Button */}
            <div>
              <button
                id="btn-google-signin"
                type="button"
                disabled={isGoogleLoading}
                onClick={handleGoogleSignInClick}
                className="w-full py-2.5 px-4 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6366f1]" />
                    <span>Connecting to Google OAuth...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Need access? Request Account */}
          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            <span>Need access? </span>
            <button
              type="button"
              onClick={() => setIsRequestModalOpen(true)}
              className="font-semibold text-[#6366f1] dark:text-[#818cf8] hover:underline cursor-pointer"
            >
              Request Account / Sign up
            </button>
          </div>
        </div>

        {/* Footer info on right */}
        <div className="w-full text-center text-[11px] text-slate-400 dark:text-slate-600 pt-6">
          Enterprise Access Portal • Secured by TLS 1.3 &amp; OAuth 2.0
        </div>
      </div>

      {/* =========================================================================
          ACCOUNT RECOVERY & TEMPORARY PASSWORD MODAL
          ========================================================================= */}
      {isForgotPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setIsForgotPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Account Recovery & Reset</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your Employee ID or email address. The system will auto-generate a temporary password and dispatch it to your Gmail inbox.
              </p>
            </div>

            {recoveryErrorMessage && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500 dark:text-red-400" />
                <span>{recoveryErrorMessage}</span>
              </div>
            )}

            {recoverySuccessMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span className="leading-relaxed">{recoverySuccessMessage}</span>
                </div>

                {generatedTempPass && (
                  <div className="mt-2 p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-emerald-200 dark:border-emerald-700 text-center">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Generated Temporary Password:</div>
                    <div className="font-mono text-base font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{generatedTempPass}</div>
                    <button
                      type="button"
                      onClick={() => {
                        setPassword(generatedTempPass);
                        setEmployeeId(recoveryIdentifier);
                        setIsForgotPasswordModalOpen(false);
                      }}
                      className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Use this password to log in</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleExecuteAccountRecovery} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Employee ID or Email Address *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={recoveryIdentifier}
                    onChange={(e) => setRecoveryIdentifier(e.target.value)}
                    placeholder="e.g. nssl.graphics@gmail.com or ADMIN-01"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#6366f1]" />
                  <span>Gmail Automated Dispatch:</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  When triggered, a temporary recovery pass will be created and dispatched to your recipient address via the Gmail API.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isRecovering}
                  className="px-4 py-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isRecovering ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating & Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Temporary Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          REQUEST ACCOUNT / SIGN UP MODAL
          ========================================================================= */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-[#6366f1]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Request System Account</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Submit employee credentials for Administrator review</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {requestSubmitted ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Request Received</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
                  Your account request has been forwarded to the system Administrator. You will receive access upon review.
                </p>
              </div>
            ) : (
              <form onSubmit={handleAccountRequestSubmit} className="p-6 space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Employee ID / Badge ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={reqEmpId}
                      onChange={(e) => setReqEmpId(e.target.value)}
                      placeholder="e.g. EMP-2026-88"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Requested Role *
                    </label>
                    <select
                      value={reqRole}
                      onChange={(e) => setReqRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="PROJECT_MANAGER">Project Manager</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={reqName}
                    onChange={(e) => setReqName(e.target.value)}
                    placeholder="e.g. David Kim"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={reqEmail}
                    onChange={(e) => setReqEmail(e.target.value)}
                    placeholder="e.g. david.kim@fxtt-enterprise.com"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={reqDepartment}
                    onChange={(e) => setReqDepartment(e.target.value)}
                    placeholder="e.g. Procurement, Engineering"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Business Justification
                  </label>
                  <textarea
                    rows={2}
                    value={reqReason}
                    onChange={(e) => setReqReason(e.target.value)}
                    placeholder="Briefly state why you need system access..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsRequestModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
