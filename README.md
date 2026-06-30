# African Market Hub (AMH)

African Market Hub (AMH) is a "Discovery-First" SaaS Marketplace Super App custom-tailored for the African market. It integrates a retail marketplace, transporter and logistics fleets, property rentals/sales agencies, and secure manual financial verification flows within a single unified platform. Designed for scalability and high-performance serverless deployment, the platform handles individual operators and verified enterprise companies alike.

---

## 🏗️ System Architecture & Enterprise Tech Stack

The system is built on a serverless, highly-resilient architecture engineered to scale to millions of users with sub-millisecond responsiveness.

*   **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, and Framer Motion transitions. Optimized for high-fidelity mobile and desktop experiences.
*   **Backend API**: Secure serverless proxy routing located in the `api/` directory (suited for serverless execution models such as Vercel).
*   **Identity & Persistence**: 
    *   **Supabase (PostgreSQL & GoTrue Auth)**: Enforces stringent Row-Level Security (RLS) across all tables.
    *   **Supabase Realtime**: Powers direct chat messaging, active carrier tracking, and instant customer notifications.
*   **Media Delivery & Private Vault**:
    *   **Cloudinary CDN**: Automated image resizing, on-the-fly optimization, and globally distributed media caching for faster page loads on mobile networks.
    *   **Supabase Storage**: Secure private document storage buckets locked with strict RLS for user identity uploads (KYC).
*   **Caching & Caching Invalidation**:
    *   **Upstash Valkey / Redis**: High-throughput distributed cache to protect the main relational database against concurrent read spikes and rate-limit active API paths.
*   **Asynchronous Orchestration**:
    *   **Upstash QStash**: Standard serverless queue system triggering background tasks (e.g., automated status cleanup workers, payment receipts) without the overhead of long-running container services.

---

##  Functional Modules

###  1. Identity & Role-Based Access Control (RBAC)
*   **Unified Auth Gate**: A multi-tab portal separating **Personal Account** (buyers, independent operators) and **Staff / Team Members** (enterprise branch staff, drivers, real estate agents).
*   **Enterprise Staff Gateway**: Restricts enterprise staff logins by cross-referencing authentication queries against a dedicated `business_members` ledger. Prevents unauthorized dashboard entry and safeguards private business spaces.
*   **Integrated Profiles**: Allows users to manage personal records, specify preferred payout accounts (Bank Name and Account Numbers), and configure notification channels.

###  2. Retail Marketplace
*   **Store System**: Registered businesses can set up and manage multiple physical or digital storefronts with unique banners, bios, and locations.
*   **Interactive Search & Filter**: Instant client-side search paired with deep-level categorization to easily discover local listings.
*   **Feedback & Verification**: Dedicated review system to provide transparent feedback and maintain high standards across stores.

###  3. Manual Checkout & Escrow-style Verification
To overcome payment automation hurdles, AMH features an intuitive, secure manual escrow loop:
1.  **Creation**: Placing an order generates a unique transactional reference code prefixed with `MH-`.
2.  **External Transfer**: The buyer views the seller's specific bank instructions and performs an off-platform transfer.
3.  **Deposit Submission**: The buyer inputs their originating account number/transaction details to serve as manual payment proof.
4.  **Verification & Release**: The seller reviews their bank ledger, verifies the reference number, and manually marks the order as paid, updating the status in real-time.

###  4. Logistics & Transport Hub
*   **Fleet Toggling**: Allows buyers to instantly switch between verified, high-capacity **Transport Parks / Companies** and individual, independent **Carriers / Dispatchers**.
*   **Transport Enterprise Command**: Park companies can manage physical branches, assign transport jobs, and invite on-duty drivers via email.
*   **Job Discovery & Tracking**: Transporters can view available cargo posts, submit bids, and manage dispatch orders through statuses: `Pending`, `In-Transit`, and `Delivered`.

###  5. Property & Real Estate Discovery
*   **Agency Showcase**: A prominent, verified agencies carousel highlighting registered local property firms and physical agencies.
*   **Interactive Portfolio**: Interactive catalogs mapping out rental properties, listings for sale, and agency branches.
*   **Staff Portals**: Agencies can add agents and managers, keeping all property updates, client chats, and listings organized within a unified business workspace.

###  6. Platform Fees, Commissions & Auto-Locking
*   **Commission Tracker**: Seamlessly tracks 1% platform commissions on orders.
*   **System Debt Safeguard**: If a vendor's cumulative commission debt surpasses a designated lock threshold, their listings are automatically hidden.
*   **Manual Debt Settlement**: To resume operations, vendors settle their balance via bank deposit (e.g., to Zenith Bank) and submit their account number as reference, which instantly triggers an administrative verification and unlock.

---

##  Environment Configurations

Create a local `.env` file at the root of your project using the variables outlined below:

```env
# Database & Backend Connections
DATABASE_URL=your_postgres_database_connection_url
POSTGRES_URL=your_postgres_pool_connection_url

# Supabase Configurations
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_public_key
VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key

# Cloudinary Integration (Public Images)
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Upstash Redis / Valkey (Caching & Rate Limiting)
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token

# Exchange Rates Integration
EXCHANGERATE_API_KEY=your_exchangerates_api_key

# Branding Configs
PROJECT_NAME="African Market Hub"
PROJECT_ID=your_project_id
```

---

##  Getting Started

### Installation
Clone the repository and install the initial dependencies:
```bash
npm install
```

### Run Local Development Server
Boot up Vite and run the backend handlers simultaneously:
```bash
npm run dev
```

### Production Compilation
Build the frontend client bundle and package the backend API endpoints:
```bash
npm run build
```

To start the production server:
```bash
npm run start
```
