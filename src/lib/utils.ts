import type { Booking } from './types';

/**
 * Generates a secure non-sequential uppercase alphanumeric token for booking URLs.
 * Example output: 8KX29PQ
 */
export function generateBookingToken(length = 7): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous chars like 0, O, 1, I
  let result = '';
  const cryptoObj = window.crypto || (window as unknown as { msCrypto: Crypto }).msCrypto;
  const values = new Uint8Array(length);
  cryptoObj.getRandomValues(values);
  for (let i = 0; i < length; i++) {
    result += chars[values[i] % chars.length];
  }
  return result;
}

/**
 * Formats a currency amount into Indian Rupee string format.
 * Example: 3800 -> "₹3,800/-"
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0/-';
  const formatted = new Intl.NumberFormat('en-IN').format(num);
  return `₹${formatted}/-`;
}

/**
 * Normalizes phone numbers to standard 10-digit format for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Format date string to user friendly output
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const today = new Date().toISOString().split('T')[0];
  if (dateStr === today) return 'Today';

  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Encodes booking payload into a safe Base64 URL parameter
 */
export function encodeBookingToUrlParam(booking: Booking): string {
  try {
    const payload = {
      t: booking.booking_token,
      pl: booking.pickup_location,
      dl: booking.drop_location,
      pd: booking.pickup_date,
      pt: booking.pickup_time,
      tt: booking.trip_type,
      vt: booking.vehicle_type,
      sc: booking.seating_capacity,
      vn: booking.vehicle_number,
      rt: booking.ride_type,
      vd: booking.vehicle_details || '',
      fa: booking.fare_amount,
      dn: booking.driver?.driver_name || '',
      dp: booking.driver?.phone_number || '',
      dw: booking.driver?.whatsapp_number || '',
      bn: booking.business?.business_name || '',
      bc: booking.business?.city || '',
      cn: booking.business?.booking_contact_name || '',
      cp: booking.business?.booking_contact_phone || ''
    };

    const jsonStr = JSON.stringify(payload);
    return btoa(encodeURIComponent(jsonStr));
  } catch (err) {
    console.error('Error encoding booking payload:', err);
    return '';
  }
}

/**
 * Decodes booking payload from URL parameter
 */
export function decodeBookingFromUrlParam(encodedParam: string): Booking | null {
  if (!encodedParam) return null;
  try {
    const jsonStr = decodeURIComponent(atob(encodedParam));
    const p = JSON.parse(jsonStr);

    if (!p || !p.pl || !p.dl) return null;

    return {
      id: `param-booking-${p.t || 'token'}`,
      booking_token: (p.t || 'BOOKING').toUpperCase(),
      driver_id: 'param-driver-id',
      business_id: 'param-biz-id',
      pickup_location: p.pl,
      drop_location: p.dl,
      pickup_date: p.pd || new Date().toISOString().split('T')[0],
      pickup_time: p.pt || '06:00 PM',
      trip_type: p.tt || 'One Way',
      vehicle_type: p.vt || 'Sedan',
      seating_capacity: p.sc || '4 + 1',
      vehicle_number: p.vn || 'MH15AB1234',
      ride_type: p.rt || 'AC',
      vehicle_details: p.vd || null,
      fare_amount: typeof p.fa === 'number' ? p.fa : parseFloat(p.fa) || 0,
      status: 'link_shared',
      expires_at: null,
      created_at: new Date().toISOString(),
      driver: {
        id: 'param-driver-id',
        auth_user_id: 'param-auth-id',
        business_id: 'param-biz-id',
        driver_name: p.dn || 'Driver',
        phone_number: p.dp || '',
        whatsapp_number: p.dw || p.dp || '',
        onboarding_completed: true
      },
      business: {
        id: 'param-biz-id',
        business_name: p.bn || 'Cab Booking',
        city: p.bc || '',
        booking_contact_name: p.cn || null,
        booking_contact_phone: p.cp || null
      },
      customer: null
    };
  } catch (err) {
    console.error('Error decoding booking payload:', err);
    return null;
  }
}
