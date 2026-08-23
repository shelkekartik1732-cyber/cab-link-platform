import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  User, 
  Phone, 
  MessageSquare, 
  Building2, 
  MapPin, 
  Contact, 
  ArrowRight, 
  CheckCircle2, 
  Loader2,
  AlertCircle 
} from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const { user, driverProfile, business, saveDriverProfile, saveBusinessDetails } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 State
  const [driverName, setDriverName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');

  // Step 2 State
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Prefill existing user data and auto-resume onboarding step
  useEffect(() => {
    const meta = user?.user_metadata || {};
    const dName = driverProfile?.driver_name || meta.driver_name || meta.full_name || '';
    const dPhone = driverProfile?.phone_number || meta.phone_number || meta.mobile || '';
    const dWhatsapp = driverProfile?.whatsapp_number || meta.whatsapp_number || dPhone;

    setDriverName(dName);
    setPhoneNumber(dPhone);
    setWhatsappNumber(dWhatsapp);

    if (business) {
      setBusinessName(business.business_name || meta.business_name || '');
      setCity(business.city || meta.city || '');
      setContactName(business.booking_contact_name || meta.booking_contact_name || '');
      setContactPhone(business.booking_contact_phone || meta.booking_contact_phone || '');
    } else if (meta.business_name) {
      setBusinessName(meta.business_name || '');
      setCity(meta.city || '');
      setContactName(meta.booking_contact_name || '');
      setContactPhone(meta.booking_contact_phone || '');
    }

    // Auto-resume to Step 2 if Step 1 details are already filled and step 2 not finished
    if ((dName && dPhone) || meta.onboarding_step === 2) {
      setStep(2);
    }
  }, [user, driverProfile, business]);

  // Handle Step 1 Save & Continue
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!driverName.trim() || !phoneNumber.trim() || !whatsappNumber.trim()) {
      setErrorMessage('Please fill in all required driver details.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await saveDriverProfile({
        driver_name: driverName.trim(),
        phone_number: phoneNumber.trim(),
        whatsapp_number: whatsappNumber.trim()
      });

      if (error) {
        setErrorMessage(error.message || 'Failed to save profile. Please try again.');
        setLoading(false);
        return;
      }

      setLoading(false);
      setStep(2); // Advance to Business Details
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred.');
      setLoading(false);
    }
  };

  // Handle Step 2 Complete Setup
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!businessName.trim() || !city.trim()) {
      setErrorMessage('Please fill in Business Name and City.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await saveBusinessDetails({
        business_name: businessName.trim(),
        city: city.trim(),
        booking_contact_name: contactName.trim(),
        booking_contact_phone: contactPhone.trim()
      });

      if (error) {
        setErrorMessage(error.message || 'Failed to save business details.');
        setLoading(false);
        return;
      }

      setLoading(false);
      setStep(3); // Success Screen

      // Automatically redirect to /admin/bookings after 1.5 seconds
      setTimeout(() => {
        navigate('/admin/bookings');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while finishing setup.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        {/* Step Indicator */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${step === 1 ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-800'}`}>
            <span>1. Driver Profile</span>
          </div>
          <div className="w-4 h-0.5 bg-slate-300" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${step === 2 ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
            <span>2. Business Details</span>
          </div>
        </div>

        {/* STEP 1: TELL US ABOUT YOU */}
        {step === 1 && (
          <div className="bg-white py-8 px-5 sm:px-8 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/80">
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Tell us about you
              </h1>
              <p className="mt-1.5 text-sm text-slate-600">
                These details will be shown to customers on your booking links.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleStep1Submit} className="space-y-4">
              {/* Driver Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Driver Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter driver name"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 placeholder-slate-400 font-medium transition-all"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile Number *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="+91 Enter mobile number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 placeholder-slate-400 font-medium transition-all"
                  />
                </div>
              </div>

              {/* WhatsApp Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  WhatsApp Number *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-whatsapp-600">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="+91 Enter WhatsApp number"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 placeholder-slate-400 font-medium transition-all"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Used by customers to launch WhatsApp directly with pre-filled trip info.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-70 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition-all mt-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: BUSINESS DETAILS */}
        {step === 2 && (
          <div className="bg-white py-8 px-5 sm:px-8 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/80">
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Business Details
              </h1>
              <p className="mt-1.5 text-sm text-slate-600">
                Add the travel business information customers will see on their booking.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleStep2Submit} className="space-y-4">
              {/* Business Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Business Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter business name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 placeholder-slate-400 font-medium transition-all"
                  />
                </div>
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  City *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 placeholder-slate-400 font-medium transition-all"
                  />
                </div>
              </div>

              {/* Booking Contact Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Booking Contact Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Contact className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter contact name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 placeholder-slate-400 font-medium transition-all"
                  />
                </div>
              </div>

              {/* Booking Contact Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Booking Contact Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    type="tel"
                    placeholder="+91 Enter contact number"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm text-slate-900 placeholder-slate-400 font-medium transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-xl transition-all text-sm"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-70 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition-all text-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Setup</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: SUCCESS STATE */}
        {step === 3 && (
          <div className="bg-white py-12 px-6 text-center shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/80">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              You're all set! ✓
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Your account is ready to create cab bookings.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-brand-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Redirecting to Bookings...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
