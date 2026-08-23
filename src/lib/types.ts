export type BookingStatus = 'draft' | 'link_shared' | 'details_received' | 'completed' | 'cancelled';

export type TripType = 'One Way' | 'Round Trip' | 'Local';
export type VehicleType = 'Sedan' | 'Ertiga' | 'Innova' | 'SUV' | 'Tempo Traveller' | 'Other';
export type RideType = 'AC' | 'Non-AC';

export interface Business {
  id: string;
  business_name: string;
  city: string;
  booking_contact_name: string | null;
  booking_contact_phone: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Driver {
  id: string;
  auth_user_id: string;
  business_id: string | null;
  driver_name: string;
  phone_number: string;
  whatsapp_number: string;
  onboarding_completed: boolean;
  created_at?: string;
  updated_at?: string;
  business?: Business | null;
}

export interface Booking {
  id: string;
  booking_token: string;
  driver_id: string;
  business_id: string | null;
  pickup_date: string;
  pickup_time: string;
  pickup_location: string;
  drop_location: string;
  trip_type: TripType;
  vehicle_type: VehicleType;
  seating_capacity: string;
  vehicle_number: string;
  ride_type: RideType;
  vehicle_details: string | null;
  fare_amount: number;
  status: BookingStatus;
  expires_at: string | null;
  created_at?: string;
  updated_at?: string;
  driver?: Driver | null;
  business?: Business | null;
  customer?: BookingCustomer | null;
}

export interface BookingCustomer {
  id: string;
  booking_id: string;
  customer_name: string;
  customer_mobile: string;
  passenger_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBookingPayload {
  pickup_date: string;
  pickup_time: string;
  pickup_location: string;
  drop_location: string;
  trip_type: TripType;
  vehicle_type: VehicleType;
  seating_capacity: string;
  vehicle_number: string;
  ride_type: RideType;
  vehicle_details?: string;
  fare_amount: number;
}
