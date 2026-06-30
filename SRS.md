# Software Requirements Specification (SRS)
## Project: African Market Hub (AMH)
### Version: 1.1.0
### Date: 2026-06-24

---

## Table of Contents
1. [Introduction](#1-introduction)
   - 1.1 [Purpose](#11-purpose)
   - 1.2 [Project Scope](#12-project-scope)
   - 1.3 [Target Audience](#13-target-audience)
2. [System Architecture & Tech Stack](#2-system-architecture--tech-stack)
   - 2.1 [Enterprise Tech Stack](#21-enterprise-tech-stack)
   - 2.2 [Data Flow & Caching Logic](#22-data-flow--caching-logic)
3. [Functional Modules & Technical Specifications](#3-functional-modules--technical-specifications)
   - 3.1 [User Management, RBAC & Auth Gate](#31-user-management-rbac--auth-gate)
   - 3.2 [Marketplace & Storefronts Module](#32-marketplace--storefronts-module)
   - 3.3 [Checkout & Manual Escrow Payments](#33-checkout--manual-escrow-payments)
   - 3.4 [Transport & Logistics Hub](#34-transport--logistics-hub)
   - 3.5 [Property & Real Estate Module](#35-property--real-estate-module)
   - 3.6 [Communications Module (Chat & Notifications)](#36-communications-module-chat--notifications)
   - 3.7 [Finance, Commissions & Auto-Locking](#37-finance-commissions--auto-locking)
4. [Database Schema (Supabase/PostgreSQL)](#4-database-schema-supabasepostgresql)
5. [Logic & Core Workflows](#5-logic--core-workflows)
   - 5.1 [Order Lifecycle](#51-order-lifecycle)
   - 5.2 [Account Locking & Debt Settlement Logic](#52-account-locking--debt-settlement-logic)
   - 5.3 [Detailed KYC Validation Processes](#53-detailed-kyc-validation-processes)
   - 5.4 [Enterprise Branch and Staff Management Flows](#54-enterprise-branch-and-staff-management-flows)
6. [Non-Functional Requirements](#6-non-functional-requirements)
   - 6.1 [Security & Access Restrictions](#61-security--access-restrictions)
   - 6.2 [Performance & Scalability Guidelines](#62-performance--scalability-guidelines)
   - 6.3 [Fault-Tolerance & Reliability](#63-fault-tolerance--reliability)

---

## 1. Introduction

### 1.1 Purpose
This document provides a highly detailed Software Requirements Specification (SRS) for the **African Market Hub (AMH)**. It covers the system architecture, complete functional capabilities, database representation, and key business logic driving the platform.

### 1.2 Project Scope
AMH is a **Discovery-First Super App** custom-tailored for the African digital commerce and logistics ecosystem. It unites:
*   **A Unified Retail Marketplace** (with self-managed, branded vendor stores).
*   **A Transport & Logistics Discovery System** (separating large Transport Parks from independent dispatchers).
*   **A Property & Rental Discovery System** (featuring agency-managed portfolios and private listings).
*   **A Secure Escrow-Style Manual Payment Flow** (tailored for manual bank transfers, deposit tracking, and verification references).
*   **A Systemic Debt Auto-Lock Safeguard** (restricting marketplace and profile visibility when commission balances exceed platform thresholds).

### 1.3 Target Audience
This document serves as the single source of truth for:
*   **Engineering Teams**: For implementing clean, robust, and scalable source code.
*   **System Architects**: For reviewing microservices boundaries, third-party CDNs, caching layers, and database scaling.
*   **Quality Assurance & Operations**: For audit references, test case designs, and system validation.

---

## 2. System Architecture & Tech Stack

### 2.1 Enterprise Tech Stack
The platform is designed to minimize server overhead, maximize network edge speeds, and run in a secure serverless configuration:

```
  +-------------------------------------------------------------+
  |                   REACT 19 FRONTEND (Vite)                  |
  |             (Tailwind CSS, Framer Motion Transitions)       |
  +-------------------------------------------------------------+
                                 |
                                 v
  +-------------------------------------------------------------+
  |              SERVERLESS CONTROLLERS / API ROUTES            |
  |        (Vercel Serverless Functions / Express Server)       |
  +-------------------------------------------------------------+
             |                    |                  |
             v                    v                  v
  +------------------+   +-----------------+   +----------------+
  | UPSTASH REDIS    |   | SUPABASE        |   | CLOUDINARY CDN |
  | (Valkey Cache,   |   | (PostgreSQL DB, |   | (Automated     |
  | Rate Limiting)   |   | GoTrue Auth)    |   | Image Delivery)|
  +------------------+   +-----------------+   +----------------+
                                  |
                                  v
                         +-----------------+
                         | UPSTASH QSTASH  |
                         | (Background     |
                         | Queue / Tasks)  |
                         +-----------------+
```

*   **Frontend SPA**: React 19, Vite, Tailwind CSS, Lucide React Icons, and Framer Motion micro-animations.
*   **API & Control Plane**: Serverless routing mapped inside the `/api` directory for lightweight, cold-start optimized execution.
*   **Database & RLS Engine**: **Supabase (PostgreSQL)**, loaded with native Row-Level Security policies to keep data strictly partitioned.
*   **Identity Provider**: **Supabase GoTrue Authentication** for managing tokens, roles, and session limits.
*   **Media Delivery & Private Vault**:
    *   **Cloudinary Integration**: Handles optimized public images (resizing, compressing, and serving from edge servers).
    *   **Supabase Storage Buckets**: Stores private identity files (KYC documents) using signed URLs with strict permission checks.
*   **Distributed Cache**: **Upstash Valkey / Redis** to manage platform state, throttle rapid API routes, and reduce relational database load.
*   **Message Broker**: **Upstash QStash** to orchestrate asynchronous jobs (such as rate cleanup workers) reliably.

### 2.2 Data Flow & Caching Logic
1.  **Read-Through Cache Pattern**: High-velocity endpoints (e.g., product details, exchange rates) first check Upstash Redis. If there is a cache miss, the data is fetched from Supabase, stored back into the cache with an appropriate Time-To-Live (TTL), and returned to the caller.
2.  **Real-Time Synchronization**: Client applications establish direct WebSocket subscriptions via Supabase Realtime (PostgreSQL Changes) to sync active chats, job dispatches, and in-app notifications instantly.
3.  **Supabase Connection Resiliency**: Backend routes check for connection availability. If Supabase is temporarily unreachable or paused (e.g., auto-paused free tier projects), routes fail gracefully with helpful warnings rather than crashing the system process.

---

## 3. Functional Modules & Technical Specifications

### 3.1 User Management, RBAC & Auth Gate
*   **Unified Auth Gate (`Auth.tsx`)**:
    *   **Personal Tab**: Standard authentication portal enabling public user signups and logins. New users default to the `Buyer` role.
    *   **Staff / Team Tab**: Restricted authentication pathway for enterprise employees (Real Estate Agents, Dispatch Managers, Drivers). This panel hides registration triggers to enforce a strict invite-only staff model.
*   **Role-Based Access Control (RBAC)**:
    *   `Buyer`: The foundational user role; permits order submissions, transporter hiring, and property searching.
    *   `Seller`: Unlocks the store creator panel, catalog management, and manual payment verification.
    *   `Transporter`: Unlocks logistics boards, route portfolios, and dispatch tracking.
    *   `Property Owner`: Unlocks the real estate listing portal and agency portfolio tools.
    *   `Admin`: Grants full control over KYC reviews, system logs, manual transaction approvals, and commission updates.
*   **Staff Guard System**: During Staff/Team login, the server executes a joint query check on the `business_members` table. If no active record maps the logging-in user to a verified business, the user session is immediately invalidated, they are logged out of Supabase Auth, and an "Access Denied" error is raised.

### 3.2 Marketplace & Storefronts Module
*   **Multi-Store Management**: Verified sellers can create and manage multiple physical or virtual storefronts. Stores feature custom avatars, background covers, bios, and locations.
*   **Dynamic Cataloging**: Support for categories, pricing, stocks, and searchable tags.
*   **Client-Side Indexing**: Real-time matching on client interfaces for fast sorting, category switching, and text search.
*   **Reviews & Ratings System**: Enables verified buyers to submit 1-to-5 star reviews with comments, which are averaged and displayed on store pages.

### 3.3 Checkout & Manual Escrow Payments
*   **Transactional Ref Creation**: Upon checking out, the system generates a distinct reference string starting with the platform prefix `MH-` (e.g., `MH-202606-XXXX`).
*   **Bank details Presentation**: Displays the specific, registered payout bank profile of the vendor (including Bank Name, Account Name, and Account Number).
*   **Proof Submission**: The buyer performs an external transaction (e.g., USSD, local banking app) and inputs their originating Account Number into the order log as formal proof.
*   **Payment Verification**: The seller inspects their bank statements, identifies the transfer matching the `MH-` reference, and manually marks the order state as "Paid" to release escrow or proceed with fulfillment.

### 3.4 Transport & Logistics Hub
*   **Enterprise vs. Individual Toggle**: A primary toggle component in `TransportFeeds` lets users filter between:
    *   **Transport Parks / Companies**: Registered logistics corporations with physical branches and assigned drivers.
    *   **Individual Dispatchers**: Independent delivery drivers operating solo.
*   **Corporate Parks Portal**: Showcases verified transport companies, displaying active fleets, coverage areas, branches, and customer feedback.
*   **Flexible Dashboards**:
    *   *Independent Mode*: A simplified log for single drivers to manage active dispatches.
    *   *Enterprise Mode*: A robust multi-branch, multi-user dashboard letting park administrators manage physical locations, invite drivers, and delegate transit orders.
*   **Job Dispatch & Tracking**: Logistics jobs support statuses: `Pending Assignment`, `Assigned`, `In-Transit`, and `Delivered`.

### 3.5 Property & Real Estate Module
*   **Verified Agencies Showcase**: A dedicated horizontally-scrolling carousel highlighting verified property management firms and real estate conglomerates.
*   **Portfolio Management**: Individual property listings display location maps, rental frequencies (e.g., monthly/yearly), sale prices, and custom property configurations (e.g., bedrooms, power backups).
*   **Flexible Dashboards**:
    *   *Individual Owner*: Direct management of a private real estate catalog.
    *   *Agency Dashboard*: A multi-agent control panel where agency admins manage agent listings, invite staff, and track real estate inquiries.

### 3.6 Communications Module (Chat & Notifications)
*   **Real-time Chat**: Fully integrated messaging portal connecting buyers, sellers, and shippers. Keeps conversations organized around orders to resolve fulfillment issues.
*   **Live Updates**: Employs Supabase WebSockets to stream typing states, read markers, and fresh messages instantly.
*   **In-App Notifications**: Real-time notifications for orders, KYC approvals, and chat messages.

### 3.7 Finance, Commissions & Auto-Locking
*   **Commission Tracking**: The platform calculates and logs a **1% commission fee** on successful transactions, appending it to the seller's profile debt ledger.
*   **Debt Auto-Lock System**: If a seller's total unpaid commission debt exceeds the platform limit (e.g., $50), their active listings are automatically hidden from discovery channels.
*   **Manual Debt Settlement**: To reactivate their account, the vendor must pay their platform dues via manual bank transfer to the official platform account (e.g., Zenith Bank) and submit payment proof. Once the platform administrator verifies and approves the proof, the vendor's debt is cleared, and their store listings are instantly restored.

---

## 4. Database Schema (Supabase/PostgreSQL)

The database schema enforces integrity and relationships across all modules:

```
  +-------------------+        +--------------------+
  |       users       |------->|    businesses      |
  +-------------------+        +--------------------+
            |                             |
            |                             v
            |                  +--------------------+
            +----------------->|  business_members  |
            |                  +--------------------+
            |                             |
            v                             v
  +-------------------+        +--------------------+
  |      orders       |        |       stores       |<---+
  +-------------------+        +--------------------+    |
            |                             |              |
            v                             v              |
  +-------------------+        +--------------------+    |
  |       jobs        |        |      products      |----+
  +-------------------+        +--------------------+
```

*   `users`: Core user profiles. Stores metadata, role arrays (`roles`), current active role (`active_role`), payment details, and KYC statuses.
*   `businesses`: Profiles representing registered companies (Real Estate Agencies, Transport Parks, Retail Corporations).
*   `business_members`: Links user accounts to a business with specific access roles (`owner`, `manager`, `agent`, `driver`) and links them to specific branches/stores.
*   `stores`: Storefronts and branches. Links to a parent business if owned by a corporation.
*   `products`: Detailed inventory items linked to a retail store.
*   `orders`: Handles transactions. Captures order totals, references, payment proof accounts, manual escrow states, and fulfillment stages.
*   `jobs`: Manages transport and logistics assignments, linking transporters, order details, and statuses.
*   `properties`: Tracks property listings (sale or rent) and links them to an owner or real estate agency.
*   `messages` & `conversations`: Stores real-time chat details and active participant states.
*   `kyc_applications`: Records identity submissions, document references, and verification progress.
*   `commission_ledger`: Tracks platform fees, commission debts, and manual settlement proofs.
*   `notifications`: Storage for real-time and fallback notifications.

---

## 5. Logic & Core Workflows

### 5.1 Order Lifecycle
```
[Order Created] ---> [Reference MH- Generated] ---> [Buyer Transfers Funds Externally]
                                                               |
                                                               v
[Order Completed] <--- [Seller Confirms Payment] <--- [Buyer Submits Proof Account]
```

### 5.2 Account Locking & Debt Settlement Logic
```
[Commission Debt Logged] ---> [Debt Exceeds Threshold ($50)?] ---> [Store Listings Hidden]
                                                                          |
                                                                          v
[Store Listings Restored] <--- [Admin Approves Proof] <--- [Seller Submits Transfer Proof]
```

### 5.3 Detailed KYC Validation Processes

#### 5.3.1 Seller KYC
*   **Individual Seller**:
    *   *Identity*: Legal Name, ID Type (National ID, Passport, Voter's Card), ID Number, ID Document upload.
    *   *Store Setup*: Store Name, Business Category, Address, Country, State, City, Proof of Address upload.
    *   *Payout Profile*: Bank Name, Account Number, Account Name.
*   **Registered Business**:
    *   *Identity*: Legal Business Name, Corporate CAC Registration Number, Business Email, Phone, Headquarters Address.

#### 5.3.2 Transporter KYC
*   **Individual Dispatcher**:
    *   *Step 1 (Identity)*: Legal Name, Phone Number, ID Document upload, Live Selfie, Residential Address.
    *   *Step 2 (License)*: Driver's License Number, Expiry Date, License upload (Front & Back).
    *   *Step 3 (Vehicle)*: Vehicle Type, Make/Model, License Plate, Color, Registration, Insurance upload, Vehicle photo.
    *   *Step 4 (Guarantor)*: Guarantor Name, Phone, and Relationship.
    *   *Step 5 (Payout)*: Bank Details (Name, Account Number, Account Name).
*   **Transport Company**:
    *   *Details*: Corporate Name, Transport License, Main Park HQ Address, and proof of public carrier insurance.

#### 5.3.3 Property Owner KYC
*   **Individual Owner**:
    *   *Step 1 (Identity)*: Legal Name, ID Number, ID upload, Selfie, Proof of Address.
    *   *Step 2 (Credentials)*: Optional Real Estate Board certificates or license details.
    *   *Step 3 (Guarantors)*: Requires **3 separate guarantors** with Name, Phone, Email, and signed Consent Letters.
    *   *Step 4 (Payout)*: Bank details for secure escrow payouts.
*   **Property Agency**:
    *   *Details*: Agency Name, Agency Description, Corporate License Number, Agency Logo, Agency Office Address.

### 5.4 Enterprise Branch and Staff Management Flows
*   **Corporate Branch Creation**:
    *   Admins submit branch profiles. The platform adds the branch to the `stores` table, matching `owner_type='business'` and `business_type='Transport Branch'` (or `Property Branch`), updating the team dashboard in real-time.
*   **Corporate Staff Invitation**:
    *   Admins input staff emails. The system verifies the user exists, then links them in the `business_members` ledger with a custom role (e.g., manager, driver, agent) tied to a specific branch.

---

## 6. Non-Functional Requirements

### 6.1 Security & Access Restrictions
*   **Row-Level Security (RLS)**: Enforces policies on all PostgreSQL tables so users can only access their own orders, chats, and private business files.
*   **Secure API Layers**: Serverless endpoints handle payment processing and sensitive checks to prevent tampering with frontend variables.
*   **Private KYC Storage**: Identity uploads go into an isolated Supabase storage bucket, accessible only via temporary, authenticated pre-signed URLs.

### 6.2 Performance & Scalability Guidelines
*   **Valkey Caching**: Keeps latency low by serving cached exchange rates and static lists from Upstash Redis.
*   **Staggered Data Fetching**: Employs query batching and optimistic UI updates to prevent database locks and API timeouts.
*   **Media Compression**: Optimizes images dynamically through Cloudinary CDN prior to client rendering.

### 6.3 Fault-Tolerance & Reliability
*   **Background Queues**: Employs Upstash QStash to queue and retry background operations (e.g., cleaning up stale listings) during high traffic.
*   **Graceful Degradation**: Protects user sessions with fallback states. If third-party integrations (e.g., exchange rates, Mapbox) are down, the application remains functional.
*   **Active Cleanup**: Features automated cron schedules to purge stale statuses, maintain database hygiene, and optimize indexes.
