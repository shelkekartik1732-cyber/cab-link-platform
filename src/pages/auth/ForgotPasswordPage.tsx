import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isConfigured } from '../../lib/supabase';
import { 
  Car, 
  Mail, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Lock, 
  ShieldCheck
} from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword, verifyEmailOtp, updatePassword } = useAuth();
  const navigate = useNavigate();

  // Wizard Steps:
  // 1: Enter Email
  // 2: Enter Email OTP Code (from email inbox)
  // 3: Set New Password
  // 4: Password Updated Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Step 1: Send Email Recovery OTP
  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await resetPassword(email.trim());

      if (error) {
        setErrorMessage(error.message || 'Failed to send recovery email OTP.');
      } else {
        setStep(2);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Email OTP Code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanToken = otpCode.trim().replace(/\D/g, '');
    if (!cleanToken || cleanToken.length < 6) {
      setErrorMessage('Please enter the 6-digit OTP code sent to your email.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await verifyEmailOtp(email.trim(), cleanToken);

      if (error && isConfigured) {
        setErrorMessage(error.message || 'Invalid or expired OTP code. Please check your email and try again.');
      } else {
        setStep(3);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error verifying OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Update Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!newPassword || !confirmPassword) {
      setErrorMessage('Please enter both password fields.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await updatePassword(newPassword);

      if (error && isConfigured) {
        setErrorMessage(error.message || 'Failed to update password.');
      } else {
        setStep(4);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred updating your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-xl shadow-brand-600/30">
            <Car className="w-8 h-8" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Forgot Password
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600 max-w-xs mx-auto">
          Verify your account via Email OTP code to set a new password.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 sm:px-8 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/80 space-y-6">
          
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: ENTER EMAIL */}
          {step === 1 && (
            <form onSubmit={handleSendEmailOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Registered Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="Enter registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 font-medium transition-all"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  We will send a 6-digit OTP code to your email address.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-70 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition-all mt-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending Email OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Send Email OTP</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <div className="mt-5 pt-4 border-t border-slate-100 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 font-bold text-xs text-slate-500 hover:text-slate-900"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2: VERIFY EMAIL OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fade-in">
              <div className="p-3.5 bg-brand-50 border border-brand-200 rounded-2xl text-xs text-brand-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-brand-800">
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  Email OTP Sent
                </span>
                <span>
                  We've sent a 6-digit verification code to <strong className="text-slate-900">{email}</strong>. Check your email inbox.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Enter 6-Digit Email OTP Code *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-[0.4em] font-mono text-xl py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900 font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-3 rounded-xl text-xs transition-colors"
                >
                  Change Email
                </button>
                <button
                  type="submit"
                  disabled={otpCode.length < 6 || loading}
                  className="flex-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-brand-600/25 transition-all"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Verify OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SET NEW PASSWORD */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4 animate-fade-in">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>OTP Verified! Enter your new password below.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-70 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition-all mt-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Reset Password</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 4 && (
            <div className="text-center space-y-4 py-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">Password Updated! ✓</h2>
              <p className="text-sm text-slate-600">
                Your password has been reset successfully. Redirecting to sign in page...
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
