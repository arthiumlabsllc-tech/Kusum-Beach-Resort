# Kusum Beach Resort Management Platform

A self-hosted Progressive Web App (PWA) for managing drink inventory, point of sale, staff, and reporting for Kusum Beach Resort in Kokrobite, Accra, Ghana.

## Features (MVP v1.0)

- **Drink Inventory Management** - Track all products with stock levels, categories, and suppliers
- **Low-Stock Alert System** - Automatic alerts when products fall below reorder levels
- **Point of Sale (POS)** - Fast, intuitive sales interface
- **Multi-Payment Processing** - Cash, MTN MoMo, Vodafone Cash, AirtelTigo Money, Crypto (Stablecoins)
- **Records & Reporting** - Sales analytics, inventory valuation, top products
- **Staff Management** - Role-based access control (Owner, Manager, Supervisor, Bartender, Waitstaff)

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- React Router (routing)
- Axios (HTTP client)
- Recharts (analytics)
- PWA with Workbox (offline support)

### Backend
- Node.js + Express + TypeScript
- PostgreSQL (database)
- Prisma ORM
- JWT Authentication
- Zod validation
- Winston logging

## Prerequisites

- **Node.js** v18 or higher
- **PostgreSQL** v14 or higher
- **npm** v8 or higher

## Quick Start

### 1. Clone and Install

```bash
# Install all dependencies
npm run install:all
```

### 2. Set Up Database

```bash
# Create PostgreSQL database
createdb kusum_beach

# Or using psql:
# CREATE DATABASE kusum_beach;

# Run migrations
npm run db:migrate

# Seed with sample data
npm run db:seed
```

### 3. Configure Environment

The server `.env` file is pre-configured for development. For production, update:
- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_SECRET` - A strong random secret
- Payment API keys (MTN MoMo, Vodafone, Breet)
- SMS/Email credentials

### 4. Run Development Servers

```bash
# Run both frontend and backend concurrently
npm run dev

# Or separately:
npm run dev:server   # Backend on http://localhost:5000
npm run dev:client   # Frontend on http://localhost:5173
```

### 5. Login

Default admin credentials:
- **Username:** `admin`
- **Password:** `admin123`

> **IMPORTANT:** Change the default password immediately after first login!

## Project Structure

```
kusum-beach/
├── server/                  # Backend API
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Seed data
│   ├── src/
│   │   ├── config/          # Environment config
│   │   ├── controllers/     # Route handlers
│   │   ├── lib/             # Prisma client, logger
│   │   ├── middleware/      # Auth, validation, errors
│   │   ├── routes/          # API routes
│   │   ├── validators/      # Zod schemas
│   │   ├── app.ts           # Express app setup
│   │   └── index.ts         # Server entry point
│   └── package.json
├── client/                  # Frontend PWA
│   ├── src/
│   │   ├── context/         # React context (Auth)
│   │   ├── layouts/         # Dashboard layout
│   │   ├── lib/             # API client
│   │   ├── pages/           # Page components
│   │   ├── types/           # TypeScript types
│   │   ├── App.tsx          # Main app with routing
│   │   ├── main.tsx         # Entry point
│   │   └── index.css        # Tailwind styles
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── package.json             # Root workspace config
└── .env.example             # Environment template
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/register` | Register user (owner/manager only) |
| GET | `/api/v1/auth/profile` | Get current user profile |
| PUT | `/api/v1/auth/change-password` | Change password |
| GET | `/api/v1/auth/users` | List all staff |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/products` | List products (with filters) |
| GET | `/api/v1/products/:id` | Get product details |
| POST | `/api/v1/products` | Create product |
| PUT | `/api/v1/products/:id` | Update product |
| DELETE | `/api/v1/products/:id` | Discontinue product |
| POST | `/api/v1/products/adjust-stock` | Adjust stock levels |
| GET | `/api/v1/products/low-stock` | Get low stock items |
| GET | `/api/v1/products/categories` | List categories |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/orders` | Create order (POS sale) |
| GET | `/api/v1/orders` | List orders |
| GET | `/api/v1/orders/:id` | Get order details |
| PATCH | `/api/v1/orders/:id/status` | Update order status |
| POST | `/api/v1/orders/:id/cancel` | Cancel order |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/reports/dashboard` | Dashboard statistics |
| GET | `/api/v1/reports/sales` | Sales report |
| GET | `/api/v1/reports/inventory` | Inventory report |
| GET | `/api/v1/reports/alerts` | Get active alerts |

## Production Deployment

### Build for Production

```bash
npm run build
```

### Option 1: Cloud Deployment (DigitalOcean/AWS)

1. Set up a Linux server with Node.js 18+ and PostgreSQL
2. Clone the project
3. Set production environment variables
4. Run migrations and seed
5. Use PM2 or systemd to keep the server running
6. Set up Nginx as reverse proxy

### Option 2: Local Deployment

1. Install PostgreSQL on the local machine
2. Follow the same steps as cloud deployment
3. Access via local network IP or localhost

### Environment Variables (Production)

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/kusum_beach
JWT_SECRET=<generate-a-strong-random-string>
CORS_ORIGIN=https://your-domain.com
# Add payment API keys, SMS, email credentials
```

## Payment Integration Notes

### MTN MoMo
- Register at [MTN MoMo Developer Portal](https://momodeveloper.mtn.com/)
- Get subscription key and primary key
- Supports collection, transfer, and remittance

### Vodafone Cash
- Contact Vodafone Ghana business team for API access
- Requires merchant account setup

### Breet (Crypto/Stablecoin)
- Register at Breet for crypto payment processing
- Supports USDT and other stablecoins
- Good for international customers

## PWA Features

- **Installable** - Can be installed on phones/tablets like a native app
- **Offline Support** - Service workers cache static assets
- **Fast Loading** - Optimized build with code splitting
- **Responsive** - Works on all screen sizes (mobile-first)

## Default Login Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Owner |

## License

Proprietary - Owned by Kusum Beach Resort

## Support

For technical support or questions, contact the development team.
