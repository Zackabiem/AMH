-- Create AMH schema (optional, but requested by user "create AMH DB if not exist")
-- We will just use the public schema as it's standard for Supabase, but we can create the tables.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    roles TEXT[] DEFAULT '{}',
    pending_roles TEXT[] DEFAULT '{}',
    active_role TEXT,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    other_names TEXT,
    address TEXT,
    phone TEXT,
    dob TEXT,
    gender TEXT,
    nationality TEXT,
    country TEXT,
    state TEXT,
    lga TEXT,
    bio TEXT,
    photo_url TEXT,
    vehicle_type TEXT,
    availability_status TEXT,
    following TEXT[] DEFAULT '{}',
    website TEXT,
    linkedin TEXT,
    twitter TEXT,
    instagram TEXT,
    addresses JSONB DEFAULT '[]',
    notification_preferences JSONB DEFAULT '{}',
    buyer_trust_score NUMERIC DEFAULT 0,
    display_name TEXT,
    total_debt NUMERIC DEFAULT 0,
    is_locked BOOLEAN DEFAULT false,
    lock_threshold NUMERIC DEFAULT 0,
    commission_rate NUMERIC DEFAULT 0,
    max_commission NUMERIC DEFAULT 0,
    min_commission NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BUSINESSES
CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    business_type TEXT NOT NULL,
    owner_user_id TEXT REFERENCES users(id),
    registration_number TEXT,
    email TEXT,
    phone TEXT,
    logo_url TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BUSINESS MEMBERS
CREATE TABLE IF NOT EXISTS business_members (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    store_id TEXT,
    status TEXT NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, user_id)
);

-- 4. STORES
CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    owner_type TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    branch_name TEXT,
    manager_user_id TEXT REFERENCES users(id),
    description TEXT,
    category TEXT NOT NULL,
    location TEXT,
    city TEXT,
    state TEXT,
    phone TEXT,
    image_url TEXT,
    rating NUMERIC DEFAULT 0,
    trust_score NUMERIC DEFAULT 0,
    followers TEXT[] DEFAULT '{}',
    verified BOOLEAN DEFAULT false,
    highlights TEXT[] DEFAULT '{}',
    business_type TEXT,
    founded_year INTEGER,
    total_sales NUMERIC DEFAULT 0,
    total_debt NUMERIC DEFAULT 0,
    is_locked BOOLEAN DEFAULT false,
    lock_threshold NUMERIC DEFAULT 0,
    commission_rate NUMERIC DEFAULT 0,
    max_commission NUMERIC DEFAULT 0,
    min_commission NUMERIC DEFAULT 0,
    response_time TEXT,
    member_since TEXT,
    delivery_fee NUMERIC DEFAULT 0,
    delivery_time TEXT,
    bank_details JSONB DEFAULT '{}',
    bank_name TEXT,
    account_number TEXT,
    currency TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    seller_id TEXT REFERENCES users(id),
    business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
    seller_name TEXT,
    store_id TEXT REFERENCES stores(id) ON DELETE CASCADE,
    store_name TEXT,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    quantity INTEGER DEFAULT 0,
    sku TEXT,
    category TEXT,
    image_url TEXT,
    location TEXT,
    rating NUMERIC DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    trust_score NUMERIC DEFAULT 0,
    is_promoted BOOLEAN DEFAULT false,
    delivery_available BOOLEAN DEFAULT false,
    likes TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    store_is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. JOBS
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    transporter_id TEXT REFERENCES users(id),
    buyer_id TEXT REFERENCES users(id),
    seller_id TEXT REFERENCES users(id),
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    status TEXT NOT NULL,
    cargo_type TEXT,
    delivery_fee NUMERIC DEFAULT 0,
    vehicle_type TEXT,
    tracking_history JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PROPERTIES
CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    owner_id TEXT REFERENCES users(id),
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    price NUMERIC NOT NULL,
    type TEXT NOT NULL,
    image_url TEXT,
    description TEXT,
    features TEXT[] DEFAULT '{}',
    owner_is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    lat NUMERIC,
    lng NUMERIC
);

-- 8. ORDERS
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    buyer_id TEXT REFERENCES users(id),
    seller_ids TEXT[] DEFAULT '{}',
    items JSONB NOT NULL DEFAULT '[]',
    total NUMERIC NOT NULL,
    status TEXT NOT NULL,
    delivery_type TEXT,
    delivery_address TEXT,
    payment_method TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. MESSAGES
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    sender_id TEXT REFERENCES users(id),
    sender_name TEXT,
    sender_role TEXT,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. CONVERSATIONS
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    participants TEXT[] NOT NULL,
    participant_names JSONB DEFAULT '{}',
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. PRIVATE MESSAGES
CREATE TABLE IF NOT EXISTS private_messages (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id TEXT REFERENCES users(id),
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. SAVED ITEMS
CREATE TABLE IF NOT EXISTS saved_items (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- 13. REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT REFERENCES users(id),
    user_name TEXT,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    store_id TEXT REFERENCES stores(id) ON DELETE CASCADE,
    rating NUMERIC NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. TRANSPORTERS
CREATE TABLE IF NOT EXISTS transporters (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    store_id TEXT REFERENCES stores(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. STORE UPDATES
CREATE TABLE IF NOT EXISTS store_updates (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    store_id TEXT REFERENCES stores(id) ON DELETE CASCADE,
    seller_id TEXT REFERENCES users(id),
    text TEXT NOT NULL,
    likes TEXT[] DEFAULT '{}',
    media_url TEXT,
    media_type TEXT, -- 'image', 'video', 'none'
    media_public_id TEXT,
    expires_at TIMESTAMPTZ,
    is_global BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if they don't exist (for existing tables)
DO $$
BEGIN
    BEGIN
        ALTER TABLE store_updates ADD COLUMN media_url TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE store_updates ADD COLUMN media_type TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE store_updates ADD COLUMN expires_at TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE store_updates ADD COLUMN is_global BOOLEAN DEFAULT false;
    EXCEPTION WHEN duplicate_column THEN END;
    BEGIN
        ALTER TABLE store_updates ADD COLUMN media_public_id TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
END $$;

-- 16. COMMISSION LEDGER
CREATE TABLE IF NOT EXISTS commission_ledger (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    target_id TEXT NOT NULL,
    target_type TEXT NOT NULL, -- 'store' or 'user'
    type TEXT NOT NULL, -- 'fee' or 'payment'
    amount NUMERIC NOT NULL,
    description TEXT,
    order_id TEXT,
    payment_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. KYC APPLICATIONS
CREATE TABLE IF NOT EXISTS kyc_applications (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. COUNTRIES
CREATE TABLE IF NOT EXISTS countries (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    currency TEXT NOT NULL,
    symbol TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for countries
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Countries are viewable by everyone." ON countries FOR SELECT USING (true);
CREATE POLICY "Only admins can insert/update/delete countries." ON countries FOR ALL USING (is_admin());

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE transporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_applications ENABLE ROW LEVEL SECURITY;

-- We will create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text 
    AND 'admin' = ANY(roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USERS
CREATE POLICY "Public profiles are viewable by everyone." ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON users FOR INSERT WITH CHECK (auth.uid()::text = id);
CREATE POLICY "Users can update own profile." ON users FOR UPDATE USING (auth.uid()::text = id OR is_admin());

-- BUSINESSES
CREATE POLICY "Businesses are viewable by everyone." ON businesses FOR SELECT USING (true);
CREATE POLICY "Users can create businesses." ON businesses FOR INSERT WITH CHECK (auth.uid()::text = owner_user_id);
CREATE POLICY "Owners can update businesses." ON businesses FOR UPDATE USING (auth.uid()::text = owner_user_id OR is_admin());
CREATE POLICY "Owners can delete businesses." ON businesses FOR DELETE USING (auth.uid()::text = owner_user_id OR is_admin());

-- STORES
CREATE POLICY "Stores are viewable by everyone." ON stores FOR SELECT USING (true);
CREATE POLICY "Store owners can insert." ON stores FOR INSERT WITH CHECK (auth.uid()::text = owner_id OR is_admin());
CREATE POLICY "Store owners can update." ON stores FOR UPDATE USING (auth.uid()::text = owner_id OR is_admin());
CREATE POLICY "Store owners can delete." ON stores FOR DELETE USING (auth.uid()::text = owner_id OR is_admin());

-- PRODUCTS
CREATE POLICY "Products are viewable by everyone." ON products FOR SELECT USING (true);
CREATE POLICY "Sellers can insert products." ON products FOR INSERT WITH CHECK (auth.uid()::text = seller_id OR is_admin());
CREATE POLICY "Sellers can update products." ON products FOR UPDATE USING (auth.uid()::text = seller_id OR is_admin());
CREATE POLICY "Sellers can delete products." ON products FOR DELETE USING (auth.uid()::text = seller_id OR is_admin());

-- ORDERS
CREATE POLICY "Users can view their own orders." ON orders FOR SELECT USING (auth.uid()::text = buyer_id OR auth.uid()::text = ANY(seller_ids) OR is_admin());
CREATE POLICY "Buyers can insert orders." ON orders FOR INSERT WITH CHECK (auth.uid()::text = buyer_id);
CREATE POLICY "Involved parties can update orders." ON orders FOR UPDATE USING (auth.uid()::text = buyer_id OR auth.uid()::text = ANY(seller_ids) OR is_admin());

-- NOTIFICATIONS
CREATE POLICY "Users can view their own notifications." ON notifications FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "System can insert notifications." ON notifications FOR INSERT WITH CHECK (true); -- In practice, restrict to service role
CREATE POLICY "Users can update their own notifications." ON notifications FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own notifications." ON notifications FOR DELETE USING (auth.uid()::text = user_id);

-- SAVED ITEMS
CREATE POLICY "Users can view their own saved items." ON saved_items FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own saved items." ON saved_items FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own saved items." ON saved_items FOR DELETE USING (auth.uid()::text = user_id);

-- REVIEWS
CREATE POLICY "Reviews are viewable by everyone." ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert their own reviews." ON reviews FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own reviews." ON reviews FOR UPDATE USING (auth.uid()::text = user_id OR is_admin());
CREATE POLICY "Users can delete their own reviews." ON reviews FOR DELETE USING (auth.uid()::text = user_id OR is_admin());

-- CONVERSATIONS
CREATE POLICY "Users can view their conversations." ON conversations FOR SELECT USING (auth.uid()::text = ANY(participants));
CREATE POLICY "Users can insert conversations." ON conversations FOR INSERT WITH CHECK (auth.uid()::text = ANY(participants));
CREATE POLICY "Users can update conversations." ON conversations FOR UPDATE USING (auth.uid()::text = ANY(participants));

-- PRIVATE MESSAGES
CREATE POLICY "Users can view messages in their conversations." ON private_messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM conversations c 
        WHERE c.id = private_messages.conversation_id 
        AND auth.uid()::text = ANY(c.participants)
    )
);
CREATE POLICY "Users can insert messages." ON private_messages FOR INSERT WITH CHECK (auth.uid()::text = sender_id);

-- JOBS
CREATE POLICY "Jobs are viewable by everyone." ON jobs FOR SELECT USING (true);
CREATE POLICY "Involved parties can insert jobs." ON jobs FOR INSERT WITH CHECK (auth.uid()::text = transporter_id OR auth.uid()::text = buyer_id);
CREATE POLICY "Involved parties can update jobs." ON jobs FOR UPDATE USING (auth.uid()::text = transporter_id OR auth.uid()::text = buyer_id OR is_admin());

-- PROPERTIES
CREATE POLICY "Properties are viewable by everyone." ON properties FOR SELECT USING (true);
CREATE POLICY "Owners can insert properties." ON properties FOR INSERT WITH CHECK (auth.uid()::text = owner_id);
CREATE POLICY "Owners can update properties." ON properties FOR UPDATE USING (auth.uid()::text = owner_id OR is_admin());
CREATE POLICY "Owners can delete properties." ON properties FOR DELETE USING (auth.uid()::text = owner_id OR is_admin());

-- KYC APPLICATIONS
CREATE POLICY "Users can view their own KYC." ON kyc_applications FOR SELECT USING (auth.uid()::text = user_id OR is_admin());
CREATE POLICY "Users can insert their own KYC." ON kyc_applications FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Admins can update KYC." ON kyc_applications FOR UPDATE USING (is_admin() OR auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own pending KYC." ON kyc_applications FOR DELETE USING (auth.uid()::text = user_id OR is_admin());

-- BUSINESS MEMBERS
CREATE POLICY "Business members are viewable by everyone." ON business_members FOR SELECT USING (true);
CREATE POLICY "Users can insert themselves as business members." ON business_members FOR INSERT WITH CHECK (auth.uid()::text = user_id OR is_admin());
CREATE POLICY "Admins can update business members." ON business_members FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete business members." ON business_members FOR DELETE USING (is_admin());

-- TRANSPORTERS
CREATE POLICY "Transporters are viewable by everyone." ON transporters FOR SELECT USING (true);
CREATE POLICY "Users can insert themselves as transporters." ON transporters FOR INSERT WITH CHECK (auth.uid()::text = user_id OR is_admin());
CREATE POLICY "Transporters can update themselves." ON transporters FOR UPDATE USING (auth.uid()::text = user_id OR is_admin());
CREATE POLICY "Transporters can delete themselves." ON transporters FOR DELETE USING (auth.uid()::text = user_id OR is_admin());

-- STORE UPDATES
CREATE POLICY "Store updates are viewable by everyone." ON store_updates FOR SELECT USING (true);
CREATE POLICY "Store owners can insert updates." ON store_updates FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM stores WHERE id = store_id AND owner_id = auth.uid()::text) OR is_admin()
);
CREATE POLICY "Store owners can update updates." ON store_updates FOR UPDATE USING (
    EXISTS (SELECT 1 FROM stores WHERE id = store_id AND owner_id = auth.uid()::text) OR is_admin()
);
CREATE POLICY "Store owners can delete updates." ON store_updates FOR DELETE USING (
    EXISTS (SELECT 1 FROM stores WHERE id = store_id AND owner_id = auth.uid()::text) OR is_admin()
);

-- COMMISSION LEDGER
CREATE POLICY "Admins can view commission ledger." ON commission_ledger FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert commission ledger." ON commission_ledger FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update commission ledger." ON commission_ledger FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete commission ledger." ON commission_ledger FOR DELETE USING (is_admin());

-- DISPUTES
CREATE TABLE IF NOT EXISTS disputes (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
    buyer_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    seller_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    store_id TEXT REFERENCES stores(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence_urls TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'open',
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own disputes." ON disputes FOR SELECT USING (auth.uid()::text = buyer_id OR auth.uid()::text = seller_id OR is_admin());
CREATE POLICY "Buyers can insert disputes." ON disputes FOR INSERT WITH CHECK (auth.uid()::text = buyer_id);
CREATE POLICY "Admins can update disputes." ON disputes FOR UPDATE USING (is_admin());
