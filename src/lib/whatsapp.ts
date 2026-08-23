import type { Booking, Driver, Business } from './types';
import { formatCurrency, formatDate, formatPhoneNumber } from './utils';

/**
 * Normalizes phone numbers for WhatsApp wa.me URLs.
 * Extracts digits and ensures 91 prefix for 10-digit Indian numbers.
 * Removes symbols, spaces, hyphens, plus signs.
 */
export function normalizeWhatsAppNumber(phone: string): string {
  if (!phone) return '';
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return `91${digitsOnly}`;
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return digitsOnly;
  }
  return digitsOnly;
}

/**
 * Builds driver share link pre-filled message
 */
export function buildDriverShareMessage(bookingUrl: string, pickup: string, drop: string): string {
  return `Hello,\n\nPlease use the link below to view your cab booking details (${pickup} to ${drop}):\n\n${bookingUrl}\n\nThank you.`;
}

/**
 * Builds driver share WhatsApp URL
 */
export function buildDriverShareWhatsAppUrl(bookingUrl: string, pickup: string, drop: string, recipientPhone?: string): string {
  const message = buildDriverShareMessage(bookingUrl, pickup, drop);
  const encoded = encodeURIComponent(message);
  
  if (recipientPhone) {
    const normalized = normalizeWhatsAppNumber(recipientPhone);
    return `https://wa.me/${normalized}?text=${encoded}`;
  }
  
  // Generic WhatsApp share URL
  return `https://wa.me/?text=${encoded}`;
}

/**
 * Builds customer-to-driver WhatsApp message dynamically
 */
export function buildCustomerToDriverMessage(
  booking: Booking,
  customer: { customer_name: string; customer_mobile: string },
  driver?: Driver | null,
  _business?: Business | null
): string {
  const driverName = driver?.driver_name || booking.driver?.driver_name || 'Driver';
  const formattedFare = formatCurrency(booking.fare_amount);
  const formattedDate = formatDate(booking.pickup_date);
  const formattedCustMobile = formatPhoneNumber(customer.customer_mobile);
  
  const cabLine = `${booking.vehicle_type} ${booking.seating_capacity}`;
  const rideLine = `${booking.ride_type} Ride`;
  const extraDetails = booking.vehicle_details ? `\n${booking.vehicle_details}` : '';
  
  return `Hello ${driverName},

I would like to proceed with this cab booking.

Passenger Details
Name: ${customer.customer_name}
Mobile: ${formattedCustMobile}

Trip Details
Pickup: ${booking.pickup_location}
Drop: ${booking.drop_location}
Date: ${formattedDate}
Time: ${booking.pickup_time}

Cab Details
Vehicle: ${cabLine}
${rideLine}${extraDetails}
Vehicle No.: ${booking.vehicle_number}

Fare: ${formattedFare}

Thank you.`;
}

/**
 * Builds customer-to-driver click-to-chat URL
 */
export function buildCustomerWhatsAppUrl(
  booking: Booking,
  customer: { customer_name: string; customer_mobile: string },
  driver?: Driver | null,
  business?: Business | null
): { url: string; rawNumber: string; message: string } {
  const targetPhone = driver?.whatsapp_number || booking.driver?.whatsapp_number || driver?.phone_number || booking.driver?.phone_number || '';
  const rawNumber = normalizeWhatsAppNumber(targetPhone);
  const message = buildCustomerToDriverMessage(booking, customer, driver, business);
  const encodedMessage = encodeURIComponent(message);

  const url = `https://wa.me/${rawNumber}?text=${encodedMessage}`;
  return { url, rawNumber, message };
}
