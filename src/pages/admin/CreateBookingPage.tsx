import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase, isConfigured } from '../../lib/supabase';
import type { Booking, TripType, VehicleType, RideType } from '../../lib/types';
import { generateBookingToken, formatCurrency, formatDate, encodeBookingToUrlParam } from '../../lib/utils';
import { buildDriverShareWhatsAppUrl } from '../../lib/whatsapp';
import { 
  Car, 
  MapPin, 
  IndianRupee, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Copy, 
  Share2, 
  Eye, 
  AlertCircle,
  Loader2,
  Building2,
  UserCheck
} from 'lucide-react';

const LOCAL_STORAGE_BOOKINGS_KEY = 'cab_link_demo_bookings';

export const CreateBookingPage: React.FC = () => {
  const { driverProfile, business } = useAuth();

  // Form state
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().split('T')[0]);
  const [pickupTime, setPickupTime] = useState('06:00 PM');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [tripType, setTripType] = useState<TripType>('One Way');

  const [vehicleType, setVehicleType] = useState<VehicleType>('Ertiga');
  const [seatingCapacity, setSeatingCapacity] = useState('6 + 1');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [rideType, setRideType] = useState<RideType>('AC');
  const [vehicleDetails, setVehicleDetails] = useState('');

  const [fareAmount, setFareAmount] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Generated Booking State
  const [generatedBooking, setGeneratedBooking] = useState<Booking | null>(null);
  const [copied, setCopied] = useState(false);

  // Stop booking creation if profile/business missing
  const profileMissing = !driverProfile?.driver_name || !driverProfile?.whatsapp_number;
  const businessMissing = !business?.business_name || !business?.city;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (profileMissing || businessMissing) {
      setErrorMessage('Please complete your Driver Profile and Business Details before creating bookings.');
      return;
    }

    if (!pickupDate || !pickupTime || !pickupLocation.trim() || !dropLocation.trim() || !vehicleNumber.trim() || !fareAmount) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    const numericFare = parseFloat(fareAmount);
    if (isNaN(numericFare) || numericFare <= 0) {
      setErrorMessage('Please enter a valid trip fare amount.');
      return;
    }

    setLoading(true);

    try {
      const token = generateBookingToken(7);

      const bookingPayload = {
        booking_token: token,
        driver_id: driverProfile.id,
        business_id: business?.id || null,
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        pickup_location: pickupLocation.trim(),
        drop_location: dropLocation.trim(),
        trip_type: tripType,
        vehicle_type: vehicleType,
        seating_capacity: seatingCapacity.trim(),
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        ride_type: rideType,
        vehicle_details: vehicleDetails.trim() || null,
        fare_amount: numericFare,
        status: 'draft' as const,
        expires_at: null,
        created_at: new Date().toISOString()
      };

      if (!isConfigured) {
        // Mock save
        const mockBooking: Booking = {
          id: `booking-${Date.now()}`,
          ...bookingPayload,
          driver: driverProfile,
          business: business
        };
        const savedJson = localStorage.getItem(LOCAL_STORAGE_BOOKINGS_KEY);
        const savedList: Booking[] = savedJson ? JSON.parse(savedJson) : [];
        savedList.unshift(mockBooking);
        localStorage.setItem(LOCAL_STORAGE_BOOKINGS_KEY, JSON.stringify(savedList));

        setGeneratedBooking(mockBooking);
        setLoading(false);
        return;
      }

      // Live Supabase insert
      const { data, error: insertErr } = await supabase
        .from('bookings')
        .insert(bookingPayload)
        .select()
        .single();

      if (insertErr) {
        console.error('Error creating booking:', insertErr);
        setErrorMessage(insertErr.message || 'Failed to create booking.');
        setLoading(false);
        return;
      }

      const createdBooking: Booking = {
        ...(data as Booking),
        driver: driverProfile,
        business: business
      };

      setGeneratedBooking(createdBooking);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const getPublicUrl = (bookingObj: Booking | null) => {
    if (!bookingObj) return '';
    const param = encodeBookingToUrlParam(bookingObj);
    return `${window.location.origin}/booking/${bookingObj.booking_token}${param ? `?d=${param}` : ''}`;
  };

  const handleCopyLink = () => {
    if (!generatedBooking) return;
    const url = getPublicUrl(generatedBooking);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!generatedBooking) return;
    const url = getPublicUrl(generatedBooking);
    const waUrl = buildDriverShareWhatsAppUrl(
      url,
      generatedBooking.pickup_location,
      generatedBooking.drop_location
    );
    window.open(waUrl, '_blank');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Create Booking
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Enter the trip details to create a customer booking link.
          </p>
        </div>
        <Link
          to="/admin/bookings"
          className="text-xs font-bold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors"
        >
          Cancel
        </Link>
      </div>

      {/* MISSING PROFILE WARNING */}
      {(profileMissing || businessMissing) && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Incomplete Setup Required</span>
              <span className="text-xs text-amber-800">
                You must complete your Driver Profile and Business Details before creating bookings.
              </span>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Link
              to="/admin/onboarding"
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl"
            >
              Complete Setup Now
            </Link>
          </div>
        </div>
      )}

      {/* GENERATED LINK SUCCESS SCREEN */}
      {generatedBooking ? (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Booking Link Ready ✓
            </h2>
            <p className="text-sm text-slate-600">
              Your customer booking page is ready to share.
            </p>
          </div>

          {/* Trip Summary Card */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-start">
              <h3 className="font-black text-slate-900 text-lg">
                {generatedBooking.pickup_location} → {generatedBooking.drop_location}
              </h3>
              <span className="font-bold text-brand-700 text-base">
                {formatCurrency(generatedBooking.fare_amount)}
              </span>
            </div>
            <div className="text-xs text-slate-600 flex flex-wrap gap-3 font-medium">
              <span>{formatDate(generatedBooking.pickup_date)} · {generatedBooking.pickup_time}</span>
              <span>·</span>
              <span>{generatedBooking.vehicle_type} ({generatedBooking.vehicle_number})</span>
            </div>
          </div>

          {/* Public Link Display */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Booking Link
            </label>
            <div className="flex items-center gap-2 p-2.5 bg-slate-100 rounded-2xl border border-slate-200">
              <input
                type="text"
                readOnly
                value={getPublicUrl(generatedBooking)}
                className="w-full bg-transparent font-mono text-xs font-semibold text-slate-800 focus:outline-none pl-2 truncate"
              />
            </div>
          </div>

          {/* Action CTAs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={handleCopyLink}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition-all"
            >
              {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="bg-whatsapp-500 hover:bg-whatsapp-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md shadow-whatsapp-500/25 transition-all"
            >
              <Share2 className="w-5 h-5" />
              <span>Share on WhatsApp</span>
            </button>

            <Link
              to={`/admin/bookings/${generatedBooking.id}`}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all text-center"
            >
              <Eye className="w-5 h-5" />
              <span>View Booking</span>
            </Link>
          </div>

          <div className="pt-4 border-t border-slate-100 text-center">
            <button
              onClick={() => {
                setGeneratedBooking(null);
                setPickupLocation('');
                setDropLocation('');
                setVehicleNumber('');
                setFareAmount('');
              }}
              className="text-xs font-bold text-brand-600 hover:text-brand-700 underline"
            >
              + Create Another Booking
            </button>
          </div>
        </div>
      ) : (
        /* CREATE BOOKING FORM */
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. TRIP DETAILS */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <MapPin className="w-5 h-5 text-brand-600" />
              Trip Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pickup Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Pickup Location *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Example: Nashik Road Railway Station"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 font-medium"
                />
              </div>

              {/* Drop Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Drop Location *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Example: Nigadi + Sinhagad Road"
                  value={dropLocation}
                  onChange={(e) => setDropLocation(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 font-medium"
                />
              </div>

              {/* Pickup Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Pickup Date *
                </label>
                <input
                  type="date"
                  required
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 font-medium"
                />
              </div>

              {/* Pickup Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Pickup Time *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Select time e.g. 6:00 PM"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 font-medium"
                />
              </div>

              {/* Trip Type */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Trip Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['One Way', 'Round Trip', 'Local'] as TripType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTripType(type)}
                      className={`
                        py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center
                        ${tripType === type 
                          ? 'bg-brand-600 text-white border-brand-600 shadow-xs' 
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}
                      `}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 2. CAB DETAILS */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Car className="w-5 h-5 text-brand-600" />
              Cab Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Vehicle Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Vehicle Type *
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 font-medium"
                >
                  <option value="Sedan">Sedan</option>
                  <option value="Ertiga">Ertiga</option>
                  <option value="Innova">Innova</option>
                  <option value="SUV">SUV</option>
                  <option value="Tempo Traveller">Tempo Traveller</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Seating Capacity */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Seating Capacity *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Example: 6 + 1"
                  value={seatingCapacity}
                  onChange={(e) => setSeatingCapacity(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 font-medium"
                />
              </div>

              {/* Vehicle Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Vehicle Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Example: MH15JW4327"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 font-medium uppercase font-mono"
                />
              </div>

              {/* Ride Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ride Type
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {(['AC', 'Non-AC'] as RideType[]).map((ride) => (
                    <button
                      key={ride}
                      type="button"
                      onClick={() => setRideType(ride)}
                      className={`
                        py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center
                        ${rideType === ride 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}
                      `}
                    >
                      {ride}
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Vehicle Details */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Additional Vehicle Details (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Example: TP + Carrier, Clean Interior"
                  value={vehicleDetails}
                  onChange={(e) => setVehicleDetails(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 font-medium"
                />
              </div>
            </div>
          </div>

          {/* 3. FARE */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <IndianRupee className="w-5 h-5 text-brand-600" />
              Fare Details
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Total Trip Fare *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 font-extrabold text-lg">
                  ₹
                </div>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="3800"
                  value={fareAmount}
                  onChange={(e) => setFareAmount(e.target.value)}
                  className="w-full pl-9 pr-4 py-3.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-lg text-slate-900 font-black"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                No online payment is collected. Fare is displayed as trip information for the customer.
              </p>
            </div>
          </div>

          {/* 4. DRIVER/BUSINESS INFORMATION READ-ONLY PREVIEW */}
          <div className="bg-slate-100/80 p-5 rounded-3xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-slate-700">
              <ShieldCheck className="w-5 h-5 text-brand-600" />
              <span className="font-bold text-xs uppercase tracking-wider">
                Customer will see on booking page
              </span>
            </div>
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <UserCheck className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">{driverProfile?.driver_name || 'Driver Name'}</span>
                  <span className="text-slate-500">{driverProfile?.phone_number || '+91 Mobile'}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">{business?.business_name || 'Business Name'}</span>
                  <span className="text-slate-500">{business?.city || 'City'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* GENERATE SUBMIT CTA */}
          <button
            type="submit"
            disabled={loading || profileMissing || businessMissing}
            className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-brand-600/30 transition-all text-base"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Generating Booking Link...</span>
              </>
            ) : (
              <>
                <span>Generate Booking Link</span>
                <ArrowRight className="w-6 h-6" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
