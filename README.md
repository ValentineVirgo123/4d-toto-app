# SG Lottery Tracker — 4D & TOTO

A full-stack prototype for tracking, scanning, and analysing Singapore 4D and TOTO lottery tickets across **Web** (desktop + mobile browser) and **Mobile** (Android/iOS via Expo).

---

## Platform Support

| Feature | Web | Mobile (Expo) |
|---|---|---|
| Ticket photo upload + OCR | ✅ | ✅ |
| 4D & TOTO result checking | ✅ | ✅ |
| TOTO System Bet expansion | ✅ | ✅ |
| Historical draw results | ✅ | ✅ |
| Predictive analysis (3 models) | ✅ | ✅ |
| Push notifications | ✅ (browser) | ✅ (Expo) |

---

## Quick Start

### Prerequisites

- Node.js 18+
- Firebase project (Firestore + Storage enabled)
- ngrok (for mobile ↔ backend connection)

### 1. Clone & install

```bash
git clone <repo-url>
cd 4d-toto-app

# Backend
cd backend && npm install

# Web
cd ../web-app && npm install

# Mobile
cd ../mobile-app && npm install
```

### 2. Configure environment

Create `backend/.env`:

```env
PORT=3001
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

### 3. Start backend

```bash
cd backend
node server.js
# Listening on http://localhost:3001
```

### 4. Expose backend for mobile (ngrok)

```bash
ngrok http 3001
# Copy the https://xxxx.ngrok-free.app URL
```

Update the API URL in these 6 files (replace the existing ngrok URL):

| File | Variable |
|---|---|
| `mobile-app/app/tabs/index.tsx` | `API` |
| `mobile-app/app/tabs/upload.tsx` | `API` |
| `mobile-app/app/tabs/history.tsx` | `API` |
| `mobile-app/app/tabs/results.tsx` | `API` |
| `mobile-app/app/tabs/predict.tsx` | `API` |
| `mobile-app/hooks/useNotifications.ts` | `API` |

### 5. Start web app

```bash
cd web-app
npm run dev
# http://localhost:5173
```

### 6. Start mobile app

```bash
cd mobile-app
npx expo start
# Scan QR code with Expo Go or run on emulator
```

---

## Project Structure

```
4d-toto-app/
├── backend/
│   ├── server.js              # Express app + cron jobs
│   ├── firebase.js            # Firebase Admin SDK init
│   ├── routes/
│   │   ├── tickets.js         # Upload, OCR, result checking
│   │   ├── results.js         # 4D & TOTO results endpoints
│   │   └── predict.js         # Prediction model endpoint
│   └── services/
│       ├── combinations.js    # TOTO system bet expansion
│       ├── scraper.js         # Singapore Pools scraper + Firestore cache
│       ├── matcher.js         # Result comparison logic
│       └── predictor.js       # 3 statistical prediction models
├── web-app/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── UploadPage.jsx
│   │   │   ├── HistoryPage.jsx
│   │   │   ├── ResultsPage.jsx
│   │   │   └── PredictPage.jsx
│   │   └── components/
│   │       ├── Navbar.jsx
│   │       └── NotificationBanner.jsx
│   └── index.html
└── mobile-app/
    ├── app/
    │   ├── _layout.tsx        # Root layout + notifications
    │   └── tabs/
    │       ├── _layout.tsx    # Tab bar (5 tabs)
    │       ├── index.tsx      # Home
    │       ├── upload.tsx     # Scan ticket
    │       ├── history.tsx    # Ticket history
    │       ├── results.tsx    # Draw results
    │       └── predict.tsx    # Predictive analysis
    └── hooks/
        └── useNotifications.ts
```

---

## Architecture

```
┌─────────────┐     ┌─────────────┐
│  Web App    │     │ Mobile App  │
│  (React 19) │     │   (Expo)    │
└──────┬──────┘     └──────┬──────┘
       │  REST API          │ REST API (ngrok)
       ▼                    ▼
┌──────────────────────────────────┐
│         Express Backend          │
│  ┌──────────┐  ┌──────────────┐  │
│  │  Routes  │  │  Cron Jobs   │  │
│  │ /tickets │  │ Hourly poll  │  │
│  │ /results │  │ Daily scrape │  │
│  │ /predict │  └──────────────┘  │
│  └────┬─────┘                   │
│       │  Services               │
│  ┌────▼──────────────────────┐  │
│  │ scraper · matcher ·       │  │
│  │ predictor · combinations  │  │
│  └────┬──────────────────────┘  │
└───────┼──────────────────────────┘
        ▼
┌───────────────────┐   ┌────────────────────┐
│  Firebase         │   │  Singapore Pools   │
│  Firestore (DB)   │   │  (web scraping +   │
│  Storage (images) │   │   mock fallback)   │
└───────────────────┘   └────────────────────┘
```

---

## API Reference

### Tickets

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tickets` | List all tickets (optional `?limit=N`) |
| `POST` | `/api/tickets/upload` | Upload ticket image (multipart/form-data) |
| `GET` | `/api/tickets/:id` | Get single ticket |
| `PATCH` | `/api/tickets/:id/notification/read` | Mark notification as read |

### Results

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/results/4d` | Past 4D draw results |
| `GET` | `/api/results/toto` | Past TOTO draw results |
| `POST` | `/api/results/check/:ticketId` | Force result check for a ticket |
| `POST` | `/api/results/scrape` | Trigger live data refresh |

### Predictions

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/predict` | Run all 3 models and return predictions |

---

## Prediction Models

| # | Model | Technique |
|---|---|---|
| 1 | Frequency Analysis | Exponential-decay weighted number frequency |
| 2 | Gap Analysis | Selects numbers most overdue relative to expected frequency |
| 3 | Markov Chain | First-order transition probability matrices per draw position |

Each model produces one **4D prediction** and one **TOTO System 12** prediction (12 numbers → 924 combinations of 6).

> **Educational only. Lottery draws are independent random events. These predictions have no predictive validity.**

---

## Key Features

### TOTO System Bet Expansion

All system bets are fully expanded into individual 6-number combinations stored in Firestore:

| System | Numbers | Combinations |
|---|---|---|
| System 7 | 7 | 7 |
| System 8 | 8 | 28 |
| System 9 | 9 | 84 |
| System 10 | 10 | 210 |
| System 11 | 11 | 462 |
| System 12 | 12 | 924 |

### Result Checking Logic

- **Past draw** (upload date > draw date + 26h buffer): Immediate result check on upload
- **Future draw**: Ticket marked `pending`; hourly cron re-checks and notifies when results are available

### Data Source

Draw results are fetched from **Singapore Pools** (`www.singaporepools.com.sg`) with Firestore caching. If the live site is unreachable, the app serves realistic mock data clearly labelled as demo data.

---

## Firestore Indexes Required

Create these composite indexes in the Firebase Console:

1. `tickets`: `drawType ASC` + `resultStatus ASC` + `createdAt DESC`
2. `tickets`: `gameType ASC` + `createdAt DESC`
3. `results_4d`: `drawDate DESC`
4. `results_toto`: `drawDate DESC`

---

## Ethics Statement

This application is built for **educational and prototype demonstration purposes only**.

- No real money transactions are facilitated
- Predictions are statistical exercises with no gambling validity
- Users are shown a disclaimer on the Predictions page
- Lottery data is sourced from publicly available Singapore Pools results
- The app does not encourage gambling behaviour

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express.js, node-cron |
| Database | Firebase Firestore |
| File Storage | Firebase Storage |
| OCR | Tesseract.js |
| Scraping | Axios + Cheerio |
| Web Frontend | React 19, Vite, React Router v7 |
| Mobile | Expo SDK 54, React Native, expo-router |
| Notifications | Expo Notifications (mobile), Browser Notification API (web) |
| Dev Tunnel | ngrok |
