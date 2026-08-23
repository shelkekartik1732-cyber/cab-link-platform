import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase, isConfigured } from '../../lib/supabase';
import { Car, Lock, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [validSession, setValidSession] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleAuthRedirect = async () => {
      if (!isConfigured) {
        setValidSession(true);
        setCheckingSession(false);
        return;
      }

      setCheckingSession(true);

      try {
        // 1. Check for PKCE flow 'code' query parameter
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Error exchanging code for session:', error);
            setErrorMessage('Your password reset link is invalid or has expired. Please request a new link.');
            setValidSession(false);
            setCheckingSession(false);
            return;
          }
          if (data.session) {
            setValidSession(true);
            setCheckingSession(false);
            return;
          }
        }

        // 2. Check if active session already exists (e.g. from Hash fragment token)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setValidSession(true);
        } else {
          // If hash fragment contains access_token, give Supabase listener a brief moment
          const hash = location.hash;
          if (hash && (hash.includes('access_token=') || hash.includes('type=recovery'))) {
            setValidSession(true);
          } else {
            setValidSession(false);
            setErrorMessage('No active password reset session found. Please use the reset link sent to your email.');
          }
        }
      } catch (err: any) {
        console.error('Error verifying recovery link:', err);
        setErrorMessage('Failed to verify password reset link.');
        setValidSession(false);
      } finally {
        setCheckingSession(false);
      }
    };

    handleAuthRedirect();
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!newPassword || !confirmPassword) {
      setErrorMessage('Please fill in both password fields.');
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

      if (error) {
        setErrorMessage(error.message || 'Failed to update password. Please request a new reset link.');
        setLoading(false);
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred updating your password.');
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-10 px-4">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-3" />
        <p className="text-sm font-semibold text-slate-600">Verifying password reset link...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-xl shadow-brand-600/30">
            <Car className="w-8 h-8" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Create New Password
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600 max-w-xs mx-auto">
          Set a new secure password for your driver account.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 sm:px-8 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/80">
          {success ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">Password Updated! ✓</h2>
              <p className="text-sm text-slate-600">
                Your password has been reset successfully. Redirecting to sign in...
              </p>
            </div>
          ) : !validSession && isConfigured ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">Invalid or Expired Link</h2>
              <p className="text-sm text-slate-600">
                {errorMessage || 'This password reset link is invalid or has expired. Please request a new link.'}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => navigate('/forgot-password')}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all"
                >
                  Request New Reset Link
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

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
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 placeholder-slate-400 font-medium transition-all"
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
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 placeholder-slate-400 font-medium transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-70 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition-all mt-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Update Password</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
