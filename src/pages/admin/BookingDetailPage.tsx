import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase, isConfigured } from '../../lib/supabase';
import type { Booking, BookingStatus } from '../../lib/types';
import { formatCurrency, formatDate, formatPhoneNumber } from '../../lib/utils';
import { buildDriverShareWhatsAppUrl } from '../../lib/whatsapp';
import { 
  Car, 
  ArrowLeft, 
  MapPin, 
  User, 
  Share2, 
  Copy, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  Check
} from 'lucide-react';

const LOCAL_STORAGE_BOOKINGS_KEY = 'cab_link_demo_bookings';

export const BookingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchBookingDetail = async () => {
    setLoading(true);
    setError('');

    if (!isConfigured) {
      const savedJson = localStorage.getItem(LOCAL_STORAGE_BOOKINGS_KEY);
      if (savedJson) {
        const list: Booking[] = JSON.parse(savedJson);
        const found = list.find((b) => b.id === id || b.booking_token === id);
        if (found) {
          setBooking(found);
        } else {
          setError('Booking not found.');
        }
      } else {
        setError('Booking not found.');
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchErr } = await supabase
        .from('bookings')
        .select(`
          *,
          driver:drivers(*),
          business:businesses(*),
          customer:booking_customers(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (fetchErr || !data) {
        setError('Booking not found or access denied.');
      } else {
        setBooking(data as Booking);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchBookingDetail();
    }
  }, [id]);

  const updateBookingStatus = async (newStatus: BookingStatus) => {
    if (!booking) return;
    setActionLoading(true);

    if (!isConfigured) {
      const savedJson = localStorage.getItem(LOCAL_STORAGE_BOOKINGS_KEY);
      if (savedJson) {
        const list: Booking[] = JSON.parse(savedJson);
        const updatedList = list.map((b) => b.id === booking.id ? { ...b, status: newStatus } : b);
        localStorage.setItem(LOCAL_STORAGE_BOOKINGS_KEY, JSON.stringify(updatedList));
        setBooking({ ...booking, status: newStatus });
      }
      setActionLoading(false);
      return;
    }

    try {
      const { error: updateErr } = await supabase
        .from('bookings')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', booking.id);

      if (updateErr) {
        alert(`Failed to update status: ${updateErr.message}`);
      } else {
        setBooking({ ...booking, status: newStatus });
      }
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getPublicUrl = () => {
    if (!booking) return '';
    return `${window.location.origin}/booking/${booking.booking_token}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getPublicUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!booking) return;
    const url = getPublicUrl();
    const waUrl = buildDriverShareWhatsAppUrl(url, booking.pickup_location, booking.drop_location);
    window.open(waUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading booking details...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md mx-auto my-10 space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">{error || 'Booking Not Found'}</h2>
        <p className="text-sm text-slate-500">The requested booking detail does not exist or you do not have permission.</p>
        <Link
          to="/admin/bookings"
          className="inline-flex items-center gap-2 bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Bookings</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/bookings')}
          className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Bookings</span>
        </button>
        <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
          #{booking.booking_token}
        </span>
      </div>

      {/* Main Booking Summary Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              <span>{booking.trip_type}</span>
              <span>·</span>
              <span>{formatDate(booking.pickup_date)}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{booking.pickup_location}</span>
              <span className="text-slate-400">→</span>
              <span>{booking.drop_location}</span>
            </h1>
          </div>
          <div>
            <span className="text-2xl font-black text-brand-700 block text-right">
              {formatCurrency(booking.fare_amount)}
            </span>
            <span className="text-xs text-slate-400 text-right block uppercase font-bold tracking-wider">
              Total Trip Fare
            </span>
          </div>
        </div>

        {/* STATUS BANNER */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Current Status
            </span>
            <span className="text-sm font-black text-slate-900 capitalize">
              {booking.status.replace('_', ' ')}
            </span>
          </div>
          <div>
            {booking.status === 'details_received' && (
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                🟢 Details Received
              </span>
            )}
            {booking.status === 'link_shared' && (
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Link Shared
              </span>
            )}
            {booking.status === 'completed' && (
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300">
                ✓ Completed
              </span>
            )}
            {booking.status === 'cancelled' && (
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                ✕ Cancelled
              </span>
            )}
            {booking.status === 'draft' && (
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Draft Link
              </span>
            )}
          </div>
        </div>

        {/* CUSTOMER DETAILS SECTION */}
        <div className="space-y-3">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-brand-600" />
            Customer Details
          </h2>

          {booking.customer ? (
            <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200/80 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase block">Passenger Name</span>
                  <span className="font-bold text-slate-900 text-base">{booking.customer.customer_name}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase block">Mobile Number</span>
                  <span className="font-bold text-slate-900 font-mono text-base">{formatPhoneNumber(booking.customer.customer_mobile)}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase block">Passenger Count</span>
                  <span className="font-bold text-slate-900 text-base">{booking.customer.passenger_count} Passenger(s)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs italic">
              No customer details submitted yet. Customer will enter their name and mobile number when opening the booking link.
            </div>
          )}
        </div>

        {/* TRIP & VEHICLE DETAILS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Pickup & Drop */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-600" />
              Route Details
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase block">Pickup Location</span>
                <span className="font-bold text-slate-900 text-sm">{booking.pickup_location}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase block">Drop Location</span>
                <span className="font-bold text-slate-900 text-sm">{booking.drop_location}</span>
              </div>
              <div className="flex gap-4 pt-1">
                <div>
                  <span className="text-slate-400 font-semibold uppercase block">Date</span>
                  <span className="font-semibold text-slate-800">{formatDate(booking.pickup_date)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase block">Time</span>
                  <span className="font-semibold text-slate-800">{booking.pickup_time}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cab Details */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Car className="w-4 h-4 text-brand-600" />
              Vehicle Details
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase block">Vehicle Type & Seats</span>
                <span className="font-bold text-slate-900 text-sm">{booking.vehicle_type} ({booking.seating_capacity} Seats)</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase block">Vehicle Number</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{booking.vehicle_number}</span>
              </div>
              <div className="flex gap-4 pt-1">
                <div>
                  <span className="text-slate-400 font-semibold uppercase block">Ride Type</span>
                  <span className="font-semibold text-slate-800">{booking.ride_type}</span>
                </div>
                {booking.vehicle_details && (
                  <div>
                    <span className="text-slate-400 font-semibold uppercase block">Additional</span>
                    <span className="font-semibold text-slate-800">{booking.vehicle_details}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PUBLIC LINK BOX & ACTIONS */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Public Customer Booking Link
          </label>
          <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-2xl border border-slate-200">
            <input
              type="text"
              readOnly
              value={getPublicUrl()}
              className="w-full bg-transparent font-mono text-xs font-semibold text-slate-800 focus:outline-none pl-2 truncate"
            />
            <button
              onClick={handleCopyLink}
              className="bg-white hover:bg-slate-50 text-slate-800 font-bold px-3 py-1.5 rounded-xl text-xs border border-slate-200 shrink-0 flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleShareWhatsApp}
              className="bg-whatsapp-500 hover:bg-whatsapp-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs shadow-md transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Link on WhatsApp</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors"
            >
              <Copy className="w-4 h-4" />
              <span>Copy Customer Link</span>
            </button>
          </div>
        </div>

        {/* STATUS MANIPULATION ACTIONS */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Booking Actions
          </span>
          <div className="flex items-center gap-2">
            {booking.status !== 'completed' && (
              <button
                onClick={() => updateBookingStatus('completed')}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark as Completed</span>
              </button>
            )}

            {booking.status !== 'cancelled' && (
              <button
                onClick={() => updateBookingStatus('cancelled')}
                disabled={actionLoading}
                className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-red-200 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Cancel Booking</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
