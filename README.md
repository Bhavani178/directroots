# DirectRoots 🌱

**DirectRoots** is a hyperlocal marketplace platform connecting consumers directly with regional farmers and rural artisans. By cutting out intermediaries, DirectRoots ensures fair prices for producers and fresh, authentic produce and handmade crafts for consumers, while optimizing delivery routes to lower transport costs and carbon emissions.

---

## 🌟 Key Features

- **Hyperlocal Discovery**: Strict 50 km local service radius calculation using the Haversine formula directly in PostgreSQL queries.
- **Multi-Role RBAC**: Dedicated experiences for `CUSTOMER`, `FARMER`, `ARTISAN`, and `ADMIN`.
- **Authoritative Server Pricing**: Unified server-side calculation for subtotals, standard delivery fees (₹40), and free delivery thresholds (₹500+).
- **Grouped Delivery Routing**: Traveling Salesperson Problem (TSP) road-network optimization via OSRM with cost and CO₂ footprint estimates (0.15 kg CO₂/km).
- **Voice Navigation**: Multi-lingual voice navigation supporting both English and Kannada (`kn-IN`) speech recognition and synthesis.
- **Pay on Delivery (COD)**: Transparent order tracking clearly identifying payment pending status until physical fulfillment.

---

## 🛠️ Architecture & Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Actions, API routes)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **ORM & Database**: [Prisma](https://www.prisma.io/) with [Neon PostgreSQL](https://neon.tech/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) (Credentials & Google OAuth)
- **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/), Radix UI, Lucide Icons, Sonner toasts
- **Maps & Geolocation**: [Leaflet](https://leafletjs.com/), OpenStreetMap Nominatim, OSRM (Open Source Routing Machine)
- **AI Intent Parsing**: Google Gemini Flash (with rate-limiting and safe fallback)

---

## 📋 Environment Variables

Create a `.env` file in the root directory:

```env
# Neon PostgreSQL Connection URL
DATABASE_URL="postgresql://user:password@ep-example.neon.tech/neondb?sslmode=require"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generated-random-32-byte-secret"

# Seed Admin Configuration (Optional Override)
SEED_ADMIN_PASSWORD="YourSecureAdminPasswordHere"

# Optional External Integrations
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GEMINI_API_KEY=""
```

> ⚠️ **Note**: If `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` are omitted or set to placeholders, Google OAuth is automatically skipped gracefully, allowing password-based authentication to function without errors.

---

## 🚀 Getting Started

### 1. Installation

```bash
git clone https://github.com/Bhavani178/directroots.git
cd directroots
npm install
```

### 2. Database Migration & Client Generation

```bash
# Push schema directly or run migrations
npm run db:push
# or
npm run db:migrate
```

### 3. Database Seeding

To populate initial categories, regional farmers, authentic products, and the administrator account:

```bash
npm run db:seed
```

### 4. Running the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the marketplace.

---

## 🧪 Testing & Verification

DirectRoots includes dedicated test suites for ACID properties, database constraints, distance algorithms, and OWASP security controls:

```bash
# Run full system health & ACID concurrency verification
npm test

# Run OWASP & RBAC security audit suite
npm run test:security
```

---

## 🔒 Security Hardening

- **Session & Privilege Protection**: Client session role overrides are explicitly rejected. All authorization decisions query the database or trusted server session.
- **Upload Security**: Uploads are restricted to authenticated producers and admins. Only JPEG, PNG, and WebP files under 4MB are allowed, verified via file signature magic bytes (banning active SVG or script payloads).
- **Cart & Pricing Invariants**: Quantities must be positive integers ($1 \le q \le 100$). Price and delivery calculations are strictly server-side.
- **Privacy Protections**: Exact homeowner coordinates and private addresses are excluded from public marketplace API responses.
- **Rate Limiting**: Sliding-window in-memory rate limiters protect registration, uploads, voice intent, and geocoding endpoints.

---

## 📄 License

Private & Proprietary. DirectRoots.
