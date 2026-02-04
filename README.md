# CP Comms

High-Performance Internal Logistics & Messaging Web App

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL or Supabase account (optional for development)

### Installation

```bash
npm install
```

### Development

Copy environment variables:
```bash
cp .env.example .env.local
```

Start both frontend and backend:
```bash
npm run dev:all
```

Or separately:
```bash
# Terminal 1 - Frontend (Next.js)
npm run dev

# Terminal 2 - Backend (Express + Socket.io)
npm run server
```

### Access Points

| Route | Role | Requires PIN |
|-------|------|--------------|
| `/office` | Office | ✓ |
| `/factory-office` | Factory Office | ✓ |
| `/store-office` | Store Office | ✓ |
| `/factory` | Factory Floor | ✗ |
| `/drivers/crown` | Crown Drivers | ✗ |
| `/drivers/electric` | Electric Drivers | ✗ |

**Dev PIN:** `1234` (for all protected routes in development mode)

## Tech Stack

- **Frontend:** Next.js 14, React 18, Zustand, Socket.io-client
- **Backend:** Express, Socket.io, node-cron
- **Database:** PostgreSQL / Supabase
- **Auth:** JWT (9-hour sessions), bcrypt PIN hashing

## Features

### Task Management
- ⚡ **State-First Sorting:** In Progress → Paused → Requested
- 🎯 **Deadline Calculation:** Created Time + Urgency Duration
- 👆 **Swipe-to-Action:** Reveal buttons on swipe left
- 🔴 **Stale Task Alert:** Red pulse after 2 hours in progress
- 🔤 **Auto-Format Initials:** "JD" → "J.D"

### Messaging (CP Chat)
- 💬 Discord-style channels (#Global-Chat, #Admin-Ops)
- 📎 Max 3 attachments per message
- 🎤 Voice notes support
- ⏰ 14-day auto-purge

### Security
- 🔐 4-digit PIN for protected routes
- ⏱️ 9-hour session persistence
- 🛡️ Route guards prevent URL manipulation

### Data Retention
- Messages: Auto-delete after 14 days
- Completed tasks: Archive for 6 months
- Rejected tasks: Visible for 1 hour with reason

## Project Structure

```
cp-comms/
├── app/                    # Next.js App Router
│   ├── api/               # API route handlers
│   ├── office/            # Office dashboard
│   └── page.tsx           # Landing / PIN entry
├── components/            # React components
│   ├── auth/              # PinInput, RouteGuard
│   ├── tasks/             # TaskCard, TaskForm
│   └── ui/                # SwipeAction, Toast
├── lib/                   # Utilities
│   ├── store.ts           # Zustand stores
│   ├── socket.ts          # Socket.io client
│   ├── types.ts           # TypeScript types
│   └── utils.ts           # Helper functions
├── server/                # Express backend
│   ├── routes/            # API routes
│   ├── socket/            # WebSocket handlers
│   └── cron/              # Scheduled jobs
└── styles/                # Global CSS
```

## Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Blue | `#2D62A9` | Headers, primary actions |
| Accent Green | `#B3E26D` | Success, completed states |
| Neutral Grey | `#D1D5DB` | Backgrounds, requested state |
