import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Car, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, onboardingCompleted, loading } = useAuth();

  if (!loading && user) {
    if (!onboardingCompleted) {
      return <Navigate to="/admin/onboarding" replace />;
    }
    return <Navigate to="/admin/bookings" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-6 sm:p-10">
      {/* Top Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-500 text-slate-900 flex items-center justify-center font-bold shadow-lg shadow-brand-500/20">
            <Car className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">
            CabLink Platform
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-xs font-bold text-slate-300 hover:text-white px-3.5 py-2 rounded-xl border border-slate-700 hover:border-slate-500 transition-all"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="text-xs font-bold bg-brand-500 hover:bg-brand-600 text-slate-900 px-4 py-2 rounded-xl transition-all shadow-md shadow-brand-500/20"
          >
            Create Account
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto w-full text-center space-y-6 my-auto py-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 text-brand-400 text-xs font-semibold border border-slate-700">
          <ShieldCheck className="w-4 h-4" />
          <span>Mobile-First Cab Booking Link Generator</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
          Create & Share Cab Booking Links in Seconds
        </h1>

        <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
          For cab drivers and travel agencies. Create instant trip links, share via WhatsApp, and receive customer passenger details without online payment or customer login.
        </p>

        {/* Value Props */}
        <div className="grid grid-cols-1 gap-2.5 text-left text-xs text-slate-300 bg-slate-800/60 p-4 rounded-2xl border border-slate-800 max-w-sm mx-auto">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Zero customer login required</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Direct WhatsApp click-to-chat integration</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Pre-filled read-only trip & cab specifications</span>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/signup"
            className="w-full sm:w-auto bg-brand-500 hover:bg-brand-600 text-slate-900 font-extrabold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-brand-500/20 transition-all text-sm"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full text-center text-xs text-slate-500 py-4">
        © CabLink Platform · Mobile-First Cab Booking Solution
      </footer>
    </div>
  );
};
