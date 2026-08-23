import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { supabase, isConfigured } from '../../lib/supabase';
import type { Booking } from '../../lib/types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { buildCustomerWhatsAppUrl } from '../../lib/whatsapp';
import { 
  Car, 
  User, 
  Phone, 
  MessageSquare, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Loader2, 
  ShieldCheck, 
  ChevronLeft
} from 'lucide-react';

const LOCAL_STORAGE_BOOKINGS_KEY = 'cab_link_demo_bookings';

export const CustomerBooking: React.FC = () => {
  const { bookingToken } = useParams<{ bookingToken: string }>();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState<'not_found' | 'expired' | 'cancelled' | null>(null);

  // Wizard Step: 1: Welcome, 2: Trip, 3: Cab, 4: Driver, 5: Customer Form, 6: Success/WhatsApp
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Customer Form State
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [passengerCount, setPassengerCount] = useState<number>(1);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Success / WhatsApp State
  const [whatsappInfo, setWhatsappInfo] = useState<{ url: string; rawNumber: string; message: string } | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [unableToOpenWa, setUnableToOpenWa] = useState(false);

  const fetchBookingByToken = async () => {
    setLoading(true);
    setErrorType(null);

    if (!bookingToken) {
      setErrorType('not_found');
      setLoading(false);
      return;
    }

    if (!isConfigured) {
      const savedJson = localStorage.getItem(LOCAL_STORAGE_BOOKINGS_KEY);
      if (savedJson) {
        const list: Booking[] = JSON.parse(savedJson);
        const found = list.find((b) => b.booking_token.toUpperCase() === bookingToken.toUpperCase());
        if (found) {
          if (found.status === 'cancelled') {
            setErrorType('cancelled');
          } else {
            setBooking(found);
          }
        } else {
          setErrorType('not_found');
        }
      } else {
        setErrorType('not_found');
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
        .eq('booking_token', bookingToken.toUpperCase())
        .maybeSingle();

      if (fetchErr || !data) {
        setErrorType('not_found');
      } else if (data.status === 'cancelled') {
        setErrorType('cancelled');
      } else {
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setErrorType('expired');
        } else {
          setBooking(data as Booking);
          if (data.customer) {
            setCustomerName(data.customer.customer_name || '');
            setCustomerMobile(data.customer.customer_mobile || '');
            setPassengerCount(data.customer.passenger_count || 1);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching booking token:', err);
      setErrorType('not_found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingByToken();
  }, [bookingToken]);

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!customerName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }

    const digitsOnly = customerMobile.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!booking) return;

    setSubmitting(true);

    try {
      const customerPayload = {
        customer_name: customerName.trim(),
        customer_mobile: customerMobile.trim(),
        passenger_count: passengerCount || 1
      };

      if (!isConfigured) {
        const updatedBooking: Booking = {
          ...booking,
          status: 'details_received',
          customer: {
            id: `cust-${Date.now()}`,
            booking_id: booking.id,
            ...customerPayload
          }
        };

        const savedJson = localStorage.getItem(LOCAL_STORAGE_BOOKINGS_KEY);
        if (savedJson) {
          const list: Booking[] = JSON.parse(savedJson);
          const updatedList = list.map((b) => b.id === booking.id ? updatedBooking : b);
          localStorage.setItem(LOCAL_STORAGE_BOOKINGS_KEY, JSON.stringify(updatedList));
        }

        setBooking(updatedBooking);

        const waDetails = buildCustomerWhatsAppUrl(
          updatedBooking,
          customerPayload,
          updatedBooking.driver,
          updatedBooking.business
        );
        setWhatsappInfo(waDetails);
        setSubmitting(false);
        setStep(6);

        tryOpenWhatsApp(waDetails.url);
        return;
      }

      const { error: rpcErr } = await supabase.rpc('submit_customer_booking_details', {
        p_token: booking.booking_token,
        p_name: customerName.trim(),
        p_mobile: customerMobile.trim(),
        p_passengers: passengerCount || 1
      });

      if (rpcErr) {
        const { error: custErr } = await supabase
          .from('booking_customers')
          .upsert({
            booking_id: booking.id,
            customer_name: customerName.trim(),
            customer_mobile: customerMobile.trim(),
            passenger_count: passengerCount || 1,
            updated_at: new Date().toISOString()
          }, { onConflict: 'booking_id' });

        if (custErr) throw custErr;

        await supabase
          .from('bookings')
          .update({ status: 'details_received', updated_at: new Date().toISOString() })
          .eq('id', booking.id);
      }

      const updatedBooking: Booking = {
        ...booking,
        status: 'details_received',
        customer: {
          id: `cust-${Date.now()}`,
          booking_id: booking.id,
          ...customerPayload
        }
      };
      setBooking(updatedBooking);

      const waDetails = buildCustomerWhatsAppUrl(
        updatedBooking,
        customerPayload,
        updatedBooking.driver,
        updatedBooking.business
      );
      setWhatsappInfo(waDetails);
      setSubmitting(false);
      setStep(6);

      tryOpenWhatsApp(waDetails.url);
    } catch (err: any) {
      console.error('Customer submission error:', err);
      setFormError(err.message || 'Unable to save your details. Please try again.');
      setSubmitting(false);
    }
  };

  const tryOpenWhatsApp = (url: string) => {
    try {
      window.location.href = url;
    } catch (e) {
      console.error('WhatsApp auto open failed:', e);
      setUnableToOpenWa(true);
    }
  };

  const handleCopyMessage = () => {
    if (!whatsappInfo) return;
    navigator.clipboard.writeText(whatsappInfo.message);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center my-auto py-20">
          <Loader2 className="w-10 h-10 animate-spin text-brand-600 mb-3" />
          <p className="text-sm font-semibold text-slate-600">Loading your cab booking...</p>
        </div>
      </PublicLayout>
    );
  }

  if (errorType) {
    return (
      <PublicLayout>
        <div className="my-auto py-12 px-4 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-2">
            <AlertCircle className="w-10 h-10" />
          </div>

          {errorType === 'not_found' && (
            <>
              <h2 className="text-2xl font-extrabold text-slate-900">Booking Not Found</h2>
              <p className="text-sm text-slate-600 max-w-xs mx-auto">
                This booking link is invalid or no longer available. Contact the driver for a new link.
              </p>
            </>
          )}

          {errorType === 'expired' && (
            <>
              <h2 className="text-2xl font-extrabold text-slate-900">Booking Link Expired</h2>
              <p className="text-sm text-slate-600 max-w-xs mx-auto">
                This booking link is no longer active. Please contact the driver for an updated link.
              </p>
            </>
          )}

          {errorType === 'cancelled' && (
            <>
              <h2 className="text-2xl font-extrabold text-slate-900">Booking Cancelled</h2>
              <p className="text-sm text-slate-600 max-w-xs mx-auto">
                This booking has been cancelled by the driver. Please contact the driver directly.
              </p>
            </>
          )}
        </div>
      </PublicLayout>
    );
  }

  if (!booking) return null;

  const businessName = booking.business?.business_name || 'Shivkrupa Tours & Travels';
  const city = booking.business?.city || 'Nashik';
  const driverName = booking.driver?.driver_name || 'Driver';

  return (
    <PublicLayout businessName={businessName} city={city}>
      {/* Step Navigation Dots */}
      {step < 6 && (
        <div className="flex items-center justify-between mb-4 px-1">
          {step > 1 ? (
            <button
              onClick={() => setStep((step - 1) as any)}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  step === s ? 'w-6 bg-brand-600' : step > s ? 'w-2 bg-slate-400' : 'w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* STEP 1: WELCOME SCREEN */}
      {step === 1 && (
        <div className="flex-1 flex flex-col justify-between py-2 space-y-6">
          <div className="space-y-4 text-center mt-4">
            <div className="w-16 h-16 rounded-3xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-md shadow-brand-500/10">
              <Car className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                {businessName}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Welcome! 👋
              </h1>
            </div>

            <p className="text-sm text-slate-600 max-w-xs mx-auto leading-relaxed">
              Your cab booking details have been shared with you. Review your trip details and continue as a guest.
            </p>

            <div className="inline-block bg-slate-100 px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-600">
              No account or login required.
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Assigned Trip</span>
            <div className="text-base font-black text-slate-900">
              {booking.pickup_location} → {booking.drop_location}
            </div>
            <div className="text-xs text-brand-700 font-bold">
              Fare: {formatCurrency(booking.fare_amount)}
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-brand-600/30 transition-all text-base mt-auto"
          >
            <span>Continue as Guest</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* STEP 2: TRIP SCREEN */}
      {step === 2 && (
        <div className="flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Your Trip
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Read-only trip specifications assigned by driver.
              </p>
            </div>

            <div className="bg-slate-900 text-white p-5 rounded-3xl space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">
                  {booking.trip_type}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  #{booking.booking_token}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-brand-400 mt-1 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Pickup Location</span>
                    <span className="font-bold text-base text-white">{booking.pickup_location}</span>
                  </div>
                </div>

                <div className="w-0.5 h-6 bg-slate-700 ml-1.5 -my-1" />

                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-400 mt-1 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Drop Location</span>
                    <span className="font-bold text-base text-white">{booking.drop_location}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Date</span>
                  <span className="font-semibold text-slate-200">{formatDate(booking.pickup_date)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Pickup Time</span>
                  <span className="font-semibold text-slate-200">{booking.pickup_time}</span>
                </div>
              </div>
            </div>

            <div className="bg-brand-50/80 p-4 rounded-2xl border border-brand-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-brand-900 block uppercase tracking-wider">
                  Total Trip Fare
                </span>
                <span className="text-xs text-slate-600 font-medium">All inclusive estimate</span>
              </div>
              <span className="text-2xl font-black text-brand-700">
                {formatCurrency(booking.fare_amount)}
              </span>
            </div>
          </div>

          <button
            onClick={() => setStep(3)}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-brand-600/25 transition-all text-base mt-auto"
          >
            <span>Next → Cab Details</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* STEP 3: CAB SCREEN */}
      {step === 3 && (
        <div className="flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Your Cab
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                The vehicle assigned to your trip.
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                    <Car className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{booking.vehicle_type}</h3>
                    <span className="text-xs text-slate-500 font-semibold">{booking.seating_capacity} Capacity</span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {booking.ride_type}
                </span>
              </div>

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block">
                    Vehicle Registration Number
                  </span>
                  <span className="text-xl font-black font-mono text-slate-900">
                    {booking.vehicle_number}
                  </span>
                </div>
                <ShieldCheck className="w-7 h-7 text-amber-600" />
              </div>

              {booking.vehicle_details && (
                <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700 block mb-0.5">Vehicle Specs & Features</span>
                  <span className="text-slate-600 font-medium">{booking.vehicle_details}</span>
                </div>
              )}

              <p className="text-[11px] text-slate-400 italic text-center">
                Vehicle details are assigned by the driver and cannot be changed here.
              </p>
            </div>
          </div>

          <button
            onClick={() => setStep(4)}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-brand-600/25 transition-all text-base mt-auto"
          >
            <span>Next → Driver Details</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* STEP 4: DRIVER SCREEN */}
      {step === 4 && (
        <div className="flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Your Driver
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Contact information for your assigned driver & agency.
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900">{driverName}</h3>
                  <span className="text-xs text-slate-500 font-medium">Assigned Driver</span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={`tel:${booking.driver?.phone_number || ''}`}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold py-3 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors"
                >
                  <Phone className="w-4 h-4 text-slate-600" />
                  <span>Call Driver</span>
                </a>

                <a
                  href={`https://wa.me/${booking.driver?.whatsapp_number?.replace(/\D/g, '') || ''}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-whatsapp-500 hover:bg-whatsapp-600 text-white font-bold py-3 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
              </div>

              {booking.business?.booking_contact_name && (
                <div className="pt-3 border-t border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Booking Contact
                  </span>
                  <div className="text-xs font-bold text-slate-800">
                    {booking.business.booking_contact_name} · {booking.business.booking_contact_phone}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 space-y-0.5">
                <div className="text-xs font-extrabold text-slate-900 uppercase">
                  {businessName}
                </div>
                <div className="text-xs text-slate-500 font-medium">{city}</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep(5)}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-brand-600/25 transition-all text-base mt-auto"
          >
            <span>Next → Enter Your Details</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* STEP 5: CUSTOMER DETAILS SCREEN */}
      {step === 5 && (
        <div className="flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Your Details
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Please enter your details to continue to WhatsApp.
              </p>
            </div>

            {formError && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form id="customer-form" onSubmit={handleCustomerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 Enter mobile number"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Number of Passengers (Optional)
                </label>
                <select
                  value={passengerCount}
                  onChange={(e) => setPassengerCount(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 font-medium"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((num) => (
                    <option key={num} value={num}>
                      {num} Passenger{num > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 leading-normal">
                🔒 Your information is only used to connect you with the driver regarding this booking.
              </div>
            </form>
          </div>

          <button
            type="submit"
            form="customer-form"
            disabled={submitting}
            className="w-full bg-whatsapp-500 hover:bg-whatsapp-600 active:bg-whatsapp-700 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-whatsapp-500/30 transition-all text-base mt-auto disabled:opacity-70"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving & Opening WhatsApp...</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-5 h-5 fill-current" />
                <span>Continue to WhatsApp →</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* STEP 6: CUSTOMER SUCCESS & WHATSAPP SCREEN */}
      {step === 6 && (
        <div className="flex-1 flex flex-col justify-between py-2 space-y-6 animate-fade-in">
          <div className="space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-1">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-slate-900">
                Your Details Are Ready ✓
              </h2>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                Your booking information is ready to be sent to the driver on WhatsApp.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 font-semibold space-y-2 text-left max-w-xs mx-auto">
              <div className="flex items-center gap-2 text-emerald-700">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Your details saved</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Booking details included</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Driver contact ready ({driverName})</span>
              </div>
            </div>

            {unableToOpenWa && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left">
                <span className="font-bold block mb-0.5">Unable to Open WhatsApp Automatically</span>
                <span>Your booking details have been saved. You can still copy the message and send it manually.</span>
              </div>
            )}
          </div>

          <div className="space-y-3 mt-auto">
            {whatsappInfo && (
              <a
                href={whatsappInfo.url}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-whatsapp-500 hover:bg-whatsapp-600 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-whatsapp-500/30 transition-all text-base text-center"
              >
                <MessageSquare className="w-5 h-5 fill-current" />
                <span>Open WhatsApp</span>
              </a>
            )}

            <button
              onClick={handleCopyMessage}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 text-sm transition-all"
            >
              {copiedMessage ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedMessage ? 'Message Copied!' : 'Copy Pre-filled Message'}</span>
            </button>

            <p className="text-[11px] text-slate-500 text-center font-medium">
              The driver will confirm the booking with you on WhatsApp.
            </p>
          </div>
        </div>
      )}
    </PublicLayout>
  );
};
