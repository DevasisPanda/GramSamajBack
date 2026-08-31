# AIRD Management System (Backend API & Admin Portal)

> **Appropriate Institute of Rural Development (AIRD Trust)**  
> Server API &bull; tRPC Endpoints &bull; Management Portal &bull; Drizzle ORM / MySQL

The backend engine and administrative management system for Appropriate Institute of Rural Development (AIRD Trust).

---

## 🌟 Architecture & Features

- **tRPC v11 API**: End-to-end type-safe RPC endpoints for authentication, memberships, donations, beneficiaries, events, gallery, and administrative management.
- **Express Server**: High-performance HTTP server with Helmet security headers, CORS origin verification, and Razorpay webhook integrations.
- **Drizzle ORM**: Relational schema migrations and database management with MySQL / PlanetScale / TiDB support.
- **Authentication**: JWT token issuance with session generation tracking and PBKDF2 / bcrypt hashing.
- **Integrated Admin Client**: SPA management dashboard built with React + Vite + Tailwind CSS.
- **Document & PDF Generation**: Automated 80G compliant donation receipts and certificate generation.
- **Cloud Media Storage**: Secure Cloudinary upload pipeline with fallback support.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ or 20+
- pnpm or npm
- MySQL database instance

### 1. Installation

```bash
pnpm install
# or
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and fill in your database and security credentials:

```bash
cp .env.example .env
```

Key environment variables:
```env
DATABASE_URL=mysql://user:password@localhost:3306/aird_db
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
ADMIN_EMAIL=admin@airdup.com
ADMIN_SEED_PASSWORD=admin123
PORT=5000
FRONTEND_URL=http://localhost:5173
```

### 3. Database Migration & Admin Seeding

```bash
# Push Drizzle schema to your database
pnpm run db:push

# Seed the initial system admin user
pnpm run db:seed
```

### 4. Running the Development Server

```bash
pnpm run dev
# or
npm run dev
```

The server will start at `http://localhost:5000/`.

---

## 🚀 Production Build & Deployment

```bash
# Build the client bundle and bundle the server
pnpm run build

# Start production server
pnpm run start
```

---

## 📄 License & Ownership

© 2026 Appropriate Institute of Rural Development (AIRD Trust). All rights reserved.
