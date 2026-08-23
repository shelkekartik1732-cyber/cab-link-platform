-- ========================================================
-- CAB BOOKING LINK PLATFORM - COMPLETE SUPABASE SCHEMA & RLS
-- ========================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BUSINESSES TABLE
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL,
    city TEXT NOT NULL,
    booking_contact_name TEXT,
    booking_contact_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DRIVERS TABLE
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    driver_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    whatsapp_number TEXT NOT NULL,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_token TEXT UNIQUE NOT NULL,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    pickup_date TEXT NOT NULL,
    pickup_time TEXT NOT NULL,
    pickup_location TEXT NOT NULL,
    drop_location TEXT NOT NULL,
    trip_type TEXT NOT NULL DEFAULT 'One Way',
    vehicle_type TEXT NOT NULL,
    seating_capacity TEXT NOT NULL,
    vehicle_number TEXT NOT NULL,
    ride_type TEXT NOT NULL DEFAULT 'AC',
    vehicle_details TEXT,
    fare_amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, link_shared, details_received, completed, cancelled
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BOOKING CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.booking_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_mobile TEXT NOT NULL,
    passenger_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR HIGH PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_bookings_token ON public.bookings(booking_token);
CREATE INDEX IF NOT EXISTS idx_bookings_driver_id ON public.bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_business_id ON public.bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_drivers_auth_user_id ON public.drivers(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_booking_customers_booking_id ON public.booking_customers(booking_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_customers ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================================

-- BUSINESSES POLICIES
CREATE POLICY "Public and Drivers can view businesses"
    ON public.businesses FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create business"
    ON public.businesses FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Drivers can update their business"
    ON public.businesses FOR UPDATE
    USING (id IN (SELECT business_id FROM public.drivers WHERE auth_user_id = auth.uid()));

-- DRIVERS POLICIES
CREATE POLICY "Public and Drivers can view drivers"
    ON public.drivers FOR SELECT
    USING (true);

CREATE POLICY "Drivers can insert own driver profile"
    ON public.drivers FOR INSERT
    WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Drivers can update own driver profile"
    ON public.drivers FOR UPDATE
    USING (auth_user_id = auth.uid());

-- BOOKINGS POLICIES
CREATE POLICY "Public and Drivers can view bookings"
    ON public.bookings FOR SELECT
    USING (true);

CREATE POLICY "Drivers can create bookings"
    ON public.bookings FOR INSERT
    WITH CHECK (driver_id IN (SELECT id FROM public.drivers WHERE auth_user_id = auth.uid()));

CREATE POLICY "Drivers or Public can update booking status"
    ON public.bookings FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Drivers can delete own bookings"
    ON public.bookings FOR DELETE
    USING (driver_id IN (SELECT id FROM public.drivers WHERE auth_user_id = auth.uid()));

-- BOOKING CUSTOMERS POLICIES
CREATE POLICY "Public and Drivers can view booking customers"
    ON public.booking_customers FOR SELECT
    USING (true);

CREATE POLICY "Public or Driver can insert customer details"
    ON public.booking_customers FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Public or Driver can update customer details"
    ON public.booking_customers FOR UPDATE
    USING (true);

-- ========================================================
-- RPC 1: SECURE PUBLIC BOOKING FETCH BY TOKEN
-- ========================================================
CREATE OR REPLACE FUNCTION public.get_public_booking_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', b.id,
        'booking_token', b.booking_token,
        'driver_id', b.driver_id,
        'business_id', b.business_id,
        'pickup_date', b.pickup_date,
        'pickup_time', b.pickup_time,
        'pickup_location', b.pickup_location,
        'drop_location', b.drop_location,
        'trip_type', b.trip_type,
        'vehicle_type', b.vehicle_type,
        'seating_capacity', b.seating_capacity,
        'vehicle_number', b.vehicle_number,
        'ride_type', b.ride_type,
        'vehicle_details', b.vehicle_details,
        'fare_amount', b.fare_amount,
        'status', b.status,
        'expires_at', b.expires_at,
        'created_at', b.created_at,
        'driver', jsonb_build_object(
            'id', d.id,
            'driver_name', d.driver_name,
            'phone_number', d.phone_number,
            'whatsapp_number', d.whatsapp_number
        ),
        'business', jsonb_build_object(
            'id', biz.id,
            'business_name', biz.business_name,
            'city', biz.city,
            'booking_contact_name', biz.booking_contact_name,
            'booking_contact_phone', biz.booking_contact_phone
        ),
        'customer', (
            SELECT jsonb_build_object(
                'id', c.id,
                'customer_name', c.customer_name,
                'customer_mobile', c.customer_mobile,
                'passenger_count', c.passenger_count
            )
            FROM public.booking_customers c
            WHERE c.booking_id = b.id
        )
    ) INTO v_result
    FROM public.bookings b
    LEFT JOIN public.drivers d ON d.id = b.driver_id
    LEFT JOIN public.businesses biz ON biz.id = b.business_id
    WHERE UPPER(b.booking_token) = UPPER(p_token);

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_booking_by_token(TEXT) TO anon, authenticated, service_role;

-- ========================================================
-- RPC 2: ATOMIC CUSTOMER SUBMISSION RPC
-- ========================================================
CREATE OR REPLACE FUNCTION public.submit_customer_booking_details(
    p_token TEXT,
    p_name TEXT,
    p_mobile TEXT,
    p_passengers INT DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id UUID;
    v_customer_id UUID;
BEGIN
    -- Find booking by token
    SELECT id INTO v_booking_id
    FROM public.bookings
    WHERE UPPER(booking_token) = UPPER(p_token);

    IF v_booking_id IS NULL THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    -- Upsert customer record
    INSERT INTO public.booking_customers (booking_id, customer_name, customer_mobile, passenger_count, updated_at)
    VALUES (v_booking_id, p_name, p_mobile, COALESCE(p_passengers, 1), NOW())
    ON CONFLICT (booking_id) 
    DO UPDATE SET 
        customer_name = EXCLUDED.customer_name,
        customer_mobile = EXCLUDED.customer_mobile,
        passenger_count = EXCLUDED.passenger_count,
        updated_at = NOW()
    RETURNING id INTO v_customer_id;

    -- Update booking status to details_received
    UPDATE public.bookings
    SET status = 'details_received', updated_at = NOW()
    WHERE id = v_booking_id;

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'customer_id', v_customer_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_customer_booking_details(TEXT, TEXT, TEXT, INT) TO anon, authenticated, service_role;
