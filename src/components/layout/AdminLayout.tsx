import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Car, 
  PlusCircle, 
  User, 
  Building2, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { driverProfile, business, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { label: 'Bookings', path: '/admin/bookings', icon: Car },
    { label: 'Create Booking', path: '/admin/bookings/new', icon: PlusCircle, isPrimary: true },
    { label: 'Driver Profile', path: '/admin/profile', icon: User },
    { label: 'Business Details', path: '/admin/business', icon: Building2 },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <Link to="/admin/bookings" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold shadow-md shadow-brand-600/20">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 text-lg leading-tight block">
              {business?.business_name || 'CabLink'}
            </span>
            <span className="text-xs text-slate-500 font-medium block">
              {driverProfile?.driver_name || 'Driver Admin'}
            </span>
          </div>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation (Desktop Static, Mobile Slide-out) */}
      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <Link to="/admin/bookings" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold shadow-lg shadow-brand-600/20">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base leading-snug block truncate max-w-[170px]">
                {business?.business_name || 'Cab Booking Admin'}
              </span>
              <span className="text-xs text-slate-500 block truncate max-w-[170px]">
                {business?.city ? `${business.city} · ${driverProfile?.driver_name}` : driverProfile?.driver_name || 'Driver Account'}
              </span>
            </div>
          </Link>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary CTA in Navigation */}
        <div className="p-4">
          <Link
            to="/admin/bookings/new"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-brand-600/25 transition-all"
          >
            <PlusCircle className="w-5 h-5" />
            <span>+ Create Booking</span>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            if (item.isPrimary) return null; // Already rendered as top CTA
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all
                  ${active 
                    ? 'bg-brand-50 text-brand-800 font-semibold shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${active ? 'text-brand-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${active ? 'text-brand-600' : 'text-slate-300'}`} />
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="bg-slate-50 p-3 rounded-xl flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Verified Driver Admin Panel</span>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
};
