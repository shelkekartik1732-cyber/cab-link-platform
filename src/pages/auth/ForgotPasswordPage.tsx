import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isConfigured } from '../../lib/supabase';
import { Car, Mail, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Loader2, KeyRound } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
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
        setErrorMessage(error.message || 'Failed to send password reset email.');
      } else {
        setSubmitted(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred.');
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
          Reset your password
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600 max-w-xs mx-auto">
          Enter your registered email address and we'll send you a password reset link.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 sm:px-8 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/80">
          {submitted ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">Check your email</h2>
              <p className="text-sm text-slate-600">
                We've sent a password reset link to <strong className="text-slate-900 font-semibold">{email}</strong>.
              </p>

              {/* Instant Reset Option */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1 mt-2">
                <span className="font-bold text-slate-700 block">Didn't receive an email or testing preview?</span>
                <Link
                  to="/reset-password"
                  className="inline-flex items-center gap-1 font-extrabold text-brand-600 hover:text-brand-700 underline"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Set New Password Directly →</span>
                </Link>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 font-bold text-slate-600 hover:text-slate-900 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Sign In</span>
                </Link>
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
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {/* Direct link for demo mode */}
              {!isConfigured && (
                <div className="text-center pt-2">
                  <Link
                    to="/reset-password"
                    className="text-xs font-semibold text-brand-600 hover:underline inline-flex items-center gap-1"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Demo Mode: Set New Password Directly</span>
                  </Link>
                </div>
              )}

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
        </div>
      </div>
    </div>
  );
};
