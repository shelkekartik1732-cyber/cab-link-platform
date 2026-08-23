import React from 'react';
import { Car, ShieldCheck } from 'lucide-react';

interface PublicLayoutProps {
  children: React.ReactNode;
  businessName?: string;
  city?: string;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ 
  children, 
  businessName = 'Cab Booking', 
  city 
}) => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start py-0 sm:py-6 px-0 sm:px-4">
      <div className="w-full max-w-md bg-white min-h-screen sm:min-h-0 sm:rounded-3xl sm:shadow-xl sm:border sm:border-slate-200 flex flex-col overflow-hidden">
        {/* Public Header */}
        <header className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-slate-900 font-bold shadow-md shadow-brand-500/20 shrink-0">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-white text-base tracking-tight leading-tight uppercase truncate max-w-[220px]">
                {businessName}
              </h1>
              {city && (
                <p className="text-xs text-slate-400 font-medium">
                  {city}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-full text-[11px] text-emerald-400 border border-slate-700/50">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Cab</span>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 flex flex-col p-4 sm:p-6">
          {children}
        </main>

        {/* Public Footer */}
        <footer className="py-3 px-4 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-400">
          Direct Cab Booking Link · Guest Passenger Confirmation
        </footer>
      </div>
    </div>
  );
};
