# AttendEase 🎓

> Stress-free university attendance tracking — for students and lecturers.

---

## Features

### Student
- Login / Register with role selection
- Dashboard: today's classes, overall attendance %, streak
- Mark attendance via **QR code** or **GPS location**
- Time-restricted check-in window (set by lecturer)
- Late vs Present auto-detection
- Attendance history per course
- Smart Insights with **AI pattern analysis** (Claude-powered)
- Lecture heatmap by weekday
- Streak system 🔥
- At-risk alert when below 75%
- **Offline check-in queue** — syncs when reconnected

### Lecturer
- Create courses with auto-generated enrollment codes
- Start sessions — location captured automatically for geofence
- Set check-in window (15 / 20 / 30 / 45 mins)
- Live QR code (refreshes every 30s — screenshot-proof)
- Real-time attendee list as students check in
- View per-student patterns & at-risk flags
- Filter students by attendance pattern
- **Export CSV** — per session or full course report

### General
- Dark / Light mode toggle
- Mobile-first, installable PWA
- JWT authentication
- Protected routes per role

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite, React Router, Recharts, Lucide |
| Backend | Node.js + Express |
| Database | MongoDB Atlas |
| Auth | JWT |
| AI | Anthropic Claude (claude-sonnet-4-20250514) |
| QR | node-qrcode |
| Geo | Haversine formula + Browser Geolocation API |
| Offline | IndexedDB (idb) |

---

## Setup

### 1. Clone / Extract

```bash
cd attendease
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in MONGO_URI, JWT_SECRET, ANTHROPIC_API_KEY
node index.js
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000/api
npm run dev
```

Visit `http://localhost:5173`

---

## Environment Variables

### Backend (`backend/.env`)
```
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_secret_here
CLIENT_URL=http://localhost:5173
ANTHROPIC_API_KEY=sk-ant-...
```

### Frontend (`frontend/.env`)
```
VITE_API_URL=http://localhost:5000/api
```

---

## Deployment

- **Frontend** → Vercel (set `VITE_API_URL` to your backend URL)
- **Backend** → Render (set all env vars in dashboard)
- **Database** → MongoDB Atlas (whitelist `0.0.0.0/0` for Render)

---

## How It Works

1. **Lecturer** creates a course → gets an enrollment code
2. **Students** enroll using the code
3. **Lecturer** starts a session → location captured → QR generated
4. **Students** have the check-in window to mark attendance (QR or location)
5. QR refreshes every 30s — screenshots are invalidated automatically
6. Location check validates student is within 50m of the classroom
7. Attendance patterns are tracked and surfaced with AI-powered summaries

---

Built with ❤️ | AttendEase v1.0
# Attend-Ease
