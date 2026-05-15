-- Run this in your Supabase SQL Editor to create the logistics tables

-- 1. Logistics Companies (Registered transport businesses)
CREATE TABLE IF NOT EXISTS public.logistics_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
    owner_id TEXT REFERENCES public.users(id),
    company_name TEXT NOT NULL,
    fleet_size INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Scheduled Routes (For Companies like buses or long distance trucks)
CREATE TABLE IF NOT EXISTS public.scheduled_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.logistics_companies(id) ON DELETE CASCADE,
    departure_city TEXT NOT NULL,
    destination_city TEXT NOT NULL,
    start_lat DOUBLE PRECISION,
    start_lng DOUBLE PRECISION,
    end_lat DOUBLE PRECISION,
    end_lng DOUBLE PRECISION,
    route_geojson JSONB, -- Stores the OpenLayers generated path
    vehicle_type TEXT NOT NULL,
    price NUMERIC NOT NULL,
    total_seats INTEGER,
    available_seats INTEGER,
    departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Live Drivers (For individual dispatchers / Uber flow)
CREATE TABLE IF NOT EXISTS public.live_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    vehicle_type TEXT NOT NULL, -- e.g., 'Bike', 'Car', 'Truck'
    vehicle_plate TEXT,
    is_online BOOLEAN DEFAULT false,
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    rating NUMERIC DEFAULT 5.0,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for fast spatial queries (finding nearby drivers)
CREATE INDEX IF NOT EXISTS idx_live_drivers_online ON public.live_drivers(is_online) WHERE is_online = true;

-- 4. Transport Requests (The Uber/Bolt style "Ride / Delivery" flow)
CREATE TABLE IF NOT EXISTS public.transport_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passenger_id TEXT REFERENCES public.users(id) NOT NULL,
    driver_id UUID REFERENCES public.live_drivers(id),
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,
    pickup_address TEXT,
    dropoff_lat DOUBLE PRECISION NOT NULL,
    dropoff_lng DOUBLE PRECISION NOT NULL,
    dropoff_address TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'in_transit', 'completed', 'cancelled'
    agreed_price NUMERIC,
    route_geojson JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Setup RLS (Row Level Security)

-- Enable RLS
ALTER TABLE public.logistics_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_requests ENABLE ROW LEVEL SECURITY;

-- Basic Policies
CREATE POLICY "Public read companies" ON public.logistics_companies FOR SELECT USING (true);
CREATE POLICY "Public read scheduled_routes" ON public.scheduled_routes FOR SELECT USING (true);

CREATE POLICY "Public read online drivers" ON public.live_drivers FOR SELECT USING (true);
CREATE POLICY "Drivers manage own status" ON public.live_drivers FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Passengers handle own requests" ON public.transport_requests FOR ALL USING (auth.uid()::text = passenger_id);
CREATE POLICY "Drivers read requests" ON public.transport_requests FOR SELECT USING (true);
CREATE POLICY "Drivers update accepted requests" ON public.transport_requests FOR UPDATE USING (auth.uid()::text IN (SELECT user_id FROM public.live_drivers WHERE id = driver_id));

-- Realtime triggers (drop first if they exist to prevent errors, though alter publication is additive usually but we can just DO statement)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'live_drivers') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.live_drivers;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'transport_requests') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_requests;
    END IF;
END $$;
