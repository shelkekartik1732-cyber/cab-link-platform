import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isConfigured, supabase } from '../../lib/supabase';
import { 
  Car, 
  Mail, 
  Phone, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Lock, 
  ShieldCheck,
  KeyRound
} from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();

  // Mode: 'email' (default production method) | 'mobile'
  const [resetMethod, setResetMethod] = useState<'email' | 'mobile'>('email');

  // Email state
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  // Direct Inline Reset State
  const [showInlineReset, setShowInlineReset] = useState(false);
  const [inlinePassword, setInlinePassword] = useState('');
  const [inlineConfirmPassword, setInlineConfirmPassword] = useState('');
  const [inlineLoading, setInlineLoading] = useState(false);

  // Mobile OTP state
  // Steps: 1: Enter Mobile, 2: Enter OTP, 3: Set New Password, 4: Success
  const [otpStep, setOtpStep] = useState<1 | 2 | 3 | 4>(1);
  const [mobileNumber, setMobileNumber] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [otpLoading, setOtpLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Email Submit Handler
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setEmailLoading(true);

    try {
      const { error } = await resetPassword(email.trim());

      if (error) {
        setErrorMessage(error.message || 'Failed to send password reset email.');
      } else {
        setEmailSubmitted(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred.');
    } finally {
      setEmailLoading(false);
    }
  };

  // 2. Direct Inline Reset Handler (for email fail-safe)
  const handleInlineResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!inlinePassword || !inlineConfirmPassword) {
      setErrorMessage('Please enter both password fields.');
      return;
    }

    if (inlinePassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (inlinePassword !== inlineConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setInlineLoading(true);

    try {
      const { error } = await updatePassword(inlinePassword);

      if (error && isConfigured) {
        setErrorMessage(error.message || 'Failed to update password.');
      } else {
        setOtpStep(4);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred updating password.');
    } finally {
      setInlineLoading(false);
    }
  };

  // 3. Mobile Step 1: Send OTP Handler
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanedMobile = mobileNumber.replace(/\D/g, '');
    if (cleanedMobile.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setOtpLoading(true);

    try {
      if (isConfigured) {
        const fullPhone = cleanedMobile.length === 10 ? `+91${cleanedMobile}` : `+${cleanedMobile}`;
        const { error: smsErr } = await supabase.auth.signInWithOtp({
          phone: fullPhone
        });

        if (smsErr) {
          setErrorMessage(smsErr.message || 'Unable to send SMS OTP. Please try using Email Link instead.');
          setOtpLoading(false);
          return;
        }
      }

      setOtpStep(2);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send OTP to mobile.');
    } finally {
      setOtpLoading(false);
    }
  };

  // 4. Mobile Step 2: Verify OTP Handler
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanedMobile = mobileNumber.replace(/\D/g, '');
    if (!inputOtp.trim() || inputOtp.trim().length < 6) {
      setErrorMessage('Please enter the 6-digit OTP code sent to your phone.');
      return;
    }

    setOtpLoading(true);

    try {
      if (isConfigured) {
        const fullPhone = cleanedMobile.length === 10 ? `+91${cleanedMobile}` : `+${cleanedMobile}`;
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          phone: fullPhone,
          token: inputOtp.trim(),
          type: 'sms'
        });

        if (verifyErr) {
          setErrorMessage(verifyErr.message || 'Invalid or expired OTP code. Please check and try again.');
          setOtpLoading(false);
          return;
        }
      }

      setOtpStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error verifying OTP code.');
    } finally {
      setOtpLoading(false);
    }
  };

  // 5. Mobile Step 3: Reset Password Handler
  const handleResetPasswordWithOtp = async (e: React.FormEvent) => {
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

    setOtpLoading(true);

    try {
      const { error } = await updatePassword(newPassword);

      if (error && isConfigured) {
        setErrorMessage(error.message || 'Failed to update password.');
      } else {
        setOtpStep(4);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred updating password.');
    } finally {
      setOtpLoading(false);
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
          Reset Password
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600 max-w-xs mx-auto">
          Choose your preferred method to reset your account password.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 sm:px-8 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/80 space-y-6">
          
          {/* Method Selection Tabs */}
          {otpStep < 4 && !emailSubmitted && (
            <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setResetMethod('email');
                  setErrorMessage('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                  resetMethod === 'email'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Link</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setResetMethod('mobile');
                  setErrorMessage('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                  resetMethod === 'mobile'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Mobile OTP</span>
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* METHOD 1: EMAIL LINK RESET (WITH FAIL-SAFE INLINE RESET) */}
          {resetMethod === 'email' && (
            <div>
              {emailSubmitted ? (
                <div className="space-y-4 py-2 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900">Check Your Email</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    We've sent a password reset link to <strong className="text-slate-900 font-semibold">{email}</strong>.
                  </p>
                  <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    Check your email inbox or spam folder for the link.
                  </p>

                  {/* Fail-safe Password Form if email is delayed */}
                  {!showInlineReset ? (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowInlineReset(true)}
                        className="text-xs font-extrabold text-brand-600 hover:text-brand-700 hover:underline inline-flex items-center gap-1"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Didn't get the email? Set new password now →</span>
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleInlineResetSubmit} className="space-y-4 text-left pt-2 border-t border-slate-100 animate-fade-in">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Set New Password
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
                            value={inlinePassword}
                            onChange={(e) => setInlinePassword(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 text-sm text-slate-900 font-medium"
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
                            value={inlineConfirmPassword}
                            onChange={(e) => setInlineConfirmPassword(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 text-sm text-slate-900 font-medium"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={inlineLoading}
                        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-70 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition-all"
                      >
                        {inlineLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Updating Password...</span>
                          </>
                        ) : (
                          <>
                            <span>Update Password & Sign In</span>
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
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
                        placeholder="Enter email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={emailLoading}
                    className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-70 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition-all mt-4"
                  >
                    {emailLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Sending Reset Link...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Reset Link</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* METHOD 2: MOBILE OTP RESET */}
          {resetMethod === 'mobile' && (
            <div>
              {/* OTP STEP 1: ENTER MOBILE NUMBER */}
              {otpStep === 1 && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Registered Mobile Number *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-5 h-5" />
                      </div>
                      <input
                        type="tel"
                        required
                        placeholder="+91 Enter mobile number"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 font-medium"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      A 6-digit verification SMS code will be sent to your phone.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-70 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition-all mt-4"
                  >
                    {otpLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Send 6-Digit OTP</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* OTP STEP 2: VERIFY OTP CODE */}
              {otpStep === 2 && (
                <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fade-in">
                  <div className="p-3.5 bg-brand-50 border border-brand-200 rounded-2xl text-xs text-brand-900 space-y-1">
                    <span className="font-bold flex items-center gap-1.5 text-brand-800">
                      <ShieldCheck className="w-4 h-4 text-brand-600" />
                      Verification Code Sent
                    </span>
                    <span>
                      Enter the 6-digit code sent to <strong>+91 {mobileNumber.replace(/\D/g, '')}</strong>.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Enter 6-Digit OTP Code *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="Enter 6-digit code"
                      value={inputOtp}
                      onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center tracking-[0.4em] font-mono text-xl py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900 font-bold"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setOtpStep(1)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-3 rounded-xl text-xs transition-colors"
                    >
                      Change Number
                    </button>
                    <button
                      type="submit"
                      disabled={inputOtp.length < 6 || otpLoading}
                      className="flex-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-brand-600/25 transition-all"
                    >
                      {otpLoading ? (
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

              {/* OTP STEP 3: SET NEW PASSWORD */}
              {otpStep === 3 && (
                <form onSubmit={handleResetPasswordWithOtp} className="space-y-4 animate-fade-in">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Mobile number verified! Enter your new password below.</span>
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
                    disabled={otpLoading}
                    className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-70 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition-all mt-4"
                  >
                    {otpLoading ? (
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

              {/* OTP STEP 4: SUCCESS */}
              {otpStep === 4 && (
                <div className="text-center space-y-4 py-4 animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900">Password Reset Successful! ✓</h2>
                  <p className="text-sm text-slate-600">
                    Your password has been updated. Redirecting to sign in page...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* BACK TO LOGIN FOOTER */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 font-bold text-xs text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};
