import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase, isConfigured } from '../../lib/supabase';
import type { Booking, BookingStatus } from '../../lib/types';
import { formatCurrency, formatDate, encodeBookingToUrlParam } from '../../lib/utils';
import { buildDriverShareWhatsAppUrl } from '../../lib/whatsapp';
import { 
  Car, 
  PlusCircle, 
  Search, 
  Share2, 
  Copy, 
  Eye, 
  Check, 
  Calendar, 
  Clock, 
  User, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';

const LOCAL_STORAGE_BOOKINGS_KEY = 'cab_link_demo_bookings';

export const BookingsListPage: React.FC = () => {
  const { driverProfile, business } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Today' | 'Upcoming' | 'Completed' | 'Cancelled'>('All');

  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    setError('');

    if (!isConfigured) {
      const saved = localStorage.getItem(LOCAL_STORAGE_BOOKINGS_KEY);
      if (saved) {
        setBookings(JSON.parse(saved));
      } else {
        setBookings([]);
      }
      setLoading(false);
      return;
    }

    try {
      if (!driverProfile?.id) {
        setLoading(false);
        return;
      }

      const { data, error: fetchErr } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:booking_customers(*)
        `)
        .eq('driver_id', driverProfile.id)
        .order('created_at', { ascending: false });

      if (fetchErr) {
        // If table doesn't exist yet, fall back to local storage
        console.warn('Bookings table not ready, using local fallback:', fetchErr.message);
        const saved = localStorage.getItem(LOCAL_STORAGE_BOOKINGS_KEY);
        setBookings(saved ? JSON.parse(saved) : []);
      } else {
        const list = (data as Booking[]) || [];
        // Attach driver & business if missing
        const enriched = list.map((b) => ({
          ...b,
          driver: b.driver || driverProfile,
          business: b.business || business
        }));
        setBookings(enriched);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [driverProfile?.id]);

  const getPublicUrl = (b: Booking) => {
    const enriched: Booking = {
      ...b,
      driver: b.driver || driverProfile,
      business: b.business || business
    };
    const param = encodeBookingToUrlParam(enriched);
    return `${window.location.origin}/booking/${b.booking_token}${param ? `?d=${param}` : ''}`;
  };

  const handleCopyLink = (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getPublicUrl(booking);
    navigator.clipboard.writeText(url);
    setCopiedToken(booking.booking_token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleShareWhatsApp = (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getPublicUrl(booking);
    const waUrl = buildDriverShareWhatsAppUrl(url, booking.pickup_location, booking.drop_location);
    window.open(waUrl, '_blank');
  };

  const renderStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'details_received':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Details Received
          </span>
        );
      case 'link_shared':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Link Shared
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            Cancelled
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Draft
          </span>
        );
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredBookings = bookings.filter((b) => {
    if (activeFilter === 'Today' && b.pickup_date !== todayStr) return false;
    if (activeFilter === 'Upcoming' && b.status !== 'draft' && b.status !== 'link_shared' && b.status !== 'details_received') return false;
    if (activeFilter === 'Completed' && b.status !== 'completed') return false;
    if (activeFilter === 'Cancelled' && b.status !== 'cancelled') return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const customerName = b.customer?.customer_name?.toLowerCase() || '';
    const route = `${b.pickup_location} ${b.drop_location}`.toLowerCase();
    const vehicle = `${b.vehicle_type} ${b.vehicle_number}`.toLowerCase();
    const token = b.booking_token.toLowerCase();

    return customerName.includes(q) || route.includes(q) || vehicle.includes(q) || token.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header & Main Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Bookings
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Manage your cab bookings and customer booking links.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchBookings}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-colors"
            title="Refresh bookings"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/admin/bookings/new"
            className="flex-1 sm:flex-initial bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold py-3 px-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-brand-600/25 transition-all text-sm"
          >
            <PlusCircle className="w-5 h-5" />
            <span>+ Create Booking</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Search by customer, route, vehicle or booking ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 placeholder-slate-400 font-medium"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(['All', 'Today', 'Upcoming', 'Completed', 'Cancelled'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`
                px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all
                ${activeFilter === filter 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
              `}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span>{error}</span>
          </div>
          <button 
            onClick={fetchBookings}
            className="text-xs font-bold underline hover:text-red-900"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading Skeleton State */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-5 rounded-3xl border border-slate-200 animate-pulse space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-6 bg-slate-200 rounded-md w-1/3" />
                <div className="h-6 bg-slate-200 rounded-full w-24" />
              </div>
              <div className="h-4 bg-slate-100 rounded-md w-1/2" />
              <div className="h-10 bg-slate-100 rounded-2xl w-full" />
            </div>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        /* Empty State */
        <div className="bg-white py-12 px-6 rounded-3xl border border-slate-200 text-center shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
            <Car className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            No bookings yet
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 max-w-sm mx-auto">
            Create your first cab booking to generate a customer link and start sharing via WhatsApp.
          </p>
          <div className="mt-6">
            <Link
              to="/admin/bookings/new"
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-brand-600/25 transition-all text-sm"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Create Booking</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Bookings List Cards */
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const customerName = b.customer?.customer_name;

            return (
              <div
                key={b.id}
                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-4 group"
              >
                {/* Top Row: Route & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <span>{b.pickup_location}</span>
                      <span className="text-slate-400">→</span>
                      <span>{b.drop_location}</span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(b.pickup_date)}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {b.pickup_time}
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-slate-700">
                        {b.trip_type}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {renderStatusBadge(b.status)}
                  </div>
                </div>

                {/* Middle Row: Vehicle & Fare */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">
                      {b.vehicle_type} · {b.vehicle_number}
                    </span>
                    <span className="text-xs text-slate-500 block font-medium">
                      {b.seating_capacity} Seats · {b.ride_type}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-base text-brand-700 block">
                      {formatCurrency(b.fare_amount)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                      Trip Fare
                    </span>
                  </div>
                </div>

                {/* Customer Details Row */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500 font-medium">Customer:</span>
                    <span className={`font-bold ${customerName ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                      {customerName || 'Waiting for details'}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                    #{b.booking_token}
                  </span>
                </div>

                {/* Actions Row */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <Link
                    to={`/admin/bookings/${b.id}`}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </Link>

                  <button
                    onClick={(e) => handleShareWhatsApp(b, e)}
                    className="flex-1 bg-whatsapp-500 hover:bg-whatsapp-600 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-xs transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share Link</span>
                  </button>

                  <button
                    onClick={(e) => handleCopyLink(b, e)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold p-2.5 rounded-xl text-xs transition-colors"
                    title="Copy Customer Booking Link"
                  >
                    {copiedToken === b.booking_token ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
