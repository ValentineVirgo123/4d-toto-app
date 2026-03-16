# SGLottery — User Manual
### Singapore 4D & TOTO Ticket Scanner Application
**Version 2.0 | March 2026**

---

## Table of Contents
1. [Overview](#1-overview)
2. [Prerequisites & Dependencies](#2-prerequisites--dependencies)
3. [Installation & Setup](#3-installation--setup)
4. [Environment Configuration](#4-environment-configuration)
5. [Running the Applications](#5-running-the-applications)
6. [Feature Guide](#6-feature-guide)
7. [Predictive Analysis Guide](#7-predictive-analysis-guide)
8. [Testing Each Feature](#8-testing-each-feature)
9. [Troubleshooting](#9-troubleshooting)
10. [Known Issues](#10-known-issues)
11. [Data Privacy & Security](#11-data-privacy--security)
12. [Architecture Overview](#12-architecture-overview)
13. [API Reference](#13-api-reference)

---

## 1. Overview

SGLottery is a full-stack application for scanning, storing, and analysing Singapore Pools 4D and TOTO lottery tickets. It supports:

- **Ticket photo upload** with OCR number extraction
- **TOTO System Bet expansion** (all C(n,6) combinations)
- **Automated result checking** against Singapore Pools
- **Push notifications** (win/loss alerts on web and mobile)
- **Predictive analysis** using 3 statistical models
- **Past results browser** (4D and TOTO)
- **Full ticket history** with sorting, filtering, and detail view

### Platform Support
| Platform         | Status |
|------------------|--------|
| Web (Desktop)    | ✅ Full support |
| Mobile Web (browser) | ✅ Responsive |
| Android (Expo)   | ✅ Full support |
| iOS (Expo)       | ✅ Full support |

---

## 2. Prerequisites & Dependencies

### Required Software

| Tool | Minimum Version | Download |
|------|----------------|---------|
| Node.js | 18.x or later | https://nodejs.org |
| npm | 9.x or later | Included with Node.js |
| Git | 2.x | https://git-scm.com |
| Expo CLI | Latest | `npm install -g expo-cli` |
| Expo Go App | Latest | iOS App Store / Google Play |

### Optional (for mobile device testing)
- Android Studio (for Android emulator)
- Xcode 15+ on macOS (for iOS simulator)

### External Services Required
| Service | Purpose | Free Tier |
|---------|---------|-----------|
| Firebase (Firestore) | Database storage | Yes |
| Firebase Storage | Ticket image storage | No (Blaze plan required — disabled in this build) |
| ngrok | Expose localhost to mobile | Yes |

---

## 3. Installation & Setup

### Step 1: Clone the Repository
```bash
git clone <your-repository-url>
cd 4d-toto-app
```

### Step 2: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 3: Install Web App Dependencies
```bash
cd ../web-app
npm install
```

### Step 4: Install Mobile App Dependencies
```bash
cd ../mobile-app
npm install
```

### Step 5: Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or use existing `d-toto-app`)
3. Enable **Firestore Database** (Native mode)
4. Enable **Firebase Storage**
5. Go to **Project Settings → Service Accounts**
6. Click **Generate New Private Key**
7. Save the downloaded JSON as `backend/serviceAccountKey.json`

### Step 6: Firestore Indexes

In Firebase Console → Firestore → Indexes, create these composite indexes:

| Collection | Fields | Order |
|-----------|--------|-------|
| `tickets` | `resultStatus` ASC, `drawType` ASC | — |
| `tickets` | `gameType` ASC, `uploadedAt` DESC | — |
| `results_4d` | `drawDate` ASC, `scrapedAt` DESC | — |
| `results_toto` | `drawDate` ASC, `scrapedAt` DESC | — |

---

## 4. Environment Configuration

### Backend `.env` File

Create `backend/.env`:
```env
PORT=3001
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NODE_ENV=development
```

Replace `your-project-id` with your actual Firebase project ID (found in Project Settings).

### Update Firebase Initialisation (if needed)

In `backend/firebase.js`, ensure the `projectId` matches your Firebase project:
```js
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'your-actual-project-id',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});
```

### Mobile App Backend URL

When testing on a physical device, `localhost` is not reachable. Use **ngrok**:

```bash
# In a separate terminal
npx ngrok http 3001
```

Copy the generated HTTPS URL (e.g. `https://abc123.ngrok-free.dev`) and update it in:
- `mobile-app/app/tabs/upload.tsx` — `const API = '...'`
- `mobile-app/app/tabs/history.tsx` — `const API = '...'`
- `mobile-app/app/tabs/index.tsx` — `const API = '...'`
- `mobile-app/app/tabs/results.tsx` — `const API = '...'`
- `mobile-app/app/tabs/predict.tsx` — `const API = '...'`
- `mobile-app/hooks/useNotifications.ts` — `const API = '...'`

---

## 5. Running the Applications

### Start the Backend

```bash
cd backend
node server.js
```

Expected output:
```
✅ SGLottery Backend running on port 3001
   Cron jobs: hourly result polling + daily result refresh
```

Verify at: http://localhost:3001

### Start the Web App

```bash
cd web-app
npm run dev
```

Expected output:
```
  VITE v7.x  ready in 300ms
  ➜  Local:   http://localhost:5173/
```

Open http://localhost:5173 in your browser.

### Start the Mobile App

```bash
cd mobile-app
npx expo start
```

- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan the QR code with **Expo Go** app (physical device)
- Press `w` for mobile web browser preview

---

## 6. Feature Guide

### 6.1 Ticket Upload (Web)

1. Navigate to **Scan** in the navbar
2. **Drag & drop** a ticket image onto the upload zone, OR
3. Click **Browse Files** to select from your computer, OR
4. On mobile browsers, click **Use Camera** to take a photo
5. The system will display OCR processing status
6. Results appear automatically with all extracted data

**Tip**: Ensure good lighting, flat ticket, no shadows.

### 6.2 Ticket Upload (Mobile App)

1. Tap the **Scan** tab (📷)
2. Tap **Take Photo** to use the camera, OR
3. Tap **Gallery** to select an existing image
4. The system analyses the image (10–30 seconds)
5. Results display with all extracted fields

### 6.3 OCR Extracted Data

After upload, the system extracts:

| Field | Description |
|-------|------------|
| Game Type | 4D or TOTO (auto-detected) |
| Bet Type | Ordinary, iBet, Roll, System N, Quick Pick, iTOTO |
| Draw Date | From ticket header |
| Numbers | All 4-digit combos (4D) or 6-number rows (TOTO) |
| Combination Count | Total number of bets |
| System Size | For TOTO System bets (7–12) |
| Serial Number | Ticket reference (if detectable) |
| Amount Paid | Dollar value (if printed) |

### 6.4 TOTO System Bet Expansion

When a System N ticket is detected:
- All C(N, 6) combinations are automatically computed
- For **System 12**: 924 combinations generated
- All combinations stored in Firestore
- All compared against official results

| System | Combinations |
|--------|-------------|
| System 7 | 7 |
| System 8 | 28 |
| System 9 | 84 |
| System 10 | 210 |
| System 11 | 462 |
| System 12 | 924 |

### 6.5 Result Checking

**Past draws** (ticket draw date already passed):
- Results are fetched immediately on upload
- Win/loss status shown within seconds

**Future draws** (ticket draw date in the future):
- Ticket saved with status **Pending**
- Backend cron job checks every hour
- When results become available, ticket is updated
- Push notification sent to device

**Manual check** (History page):
- Click any ticket card to open detail view
- Click **Check Now** button for pending tickets

### 6.6 Ticket History

**Web** — Navigate to **History**:
- Filter by: All / 4D / TOTO / System Bets / Won / Pending
- Sort by: Newest, Oldest, Winning First, Game Type
- Click any card to open full detail view (OCR data, expanded combinations, win matches)

**Mobile** — Tap **History** tab (📋):
- Same filter tabs at the top
- Tap any card to expand details in place
- Pull down to refresh

### 6.7 Past Results

**Web** — Navigate to **Results**:
- Switch between 4D and TOTO tabs
- Click **Refresh Live** to re-scrape Singapore Pools
- Displays 1st/2nd/3rd prizes, starters, consolation (4D)
- Winning balls + additional number, jackpot amount (TOTO)

**Mobile** — Tap **Results** tab (📊):
- Same interface, pull down to refresh

### 6.8 Notifications

**Web**: Browser push notifications are requested on first visit. Allow permission. Notifications fire when:
- A pending ticket's result becomes available
- The in-app banner also appears (top-right corner)

**Mobile**: Expo push notification permission requested on first launch. Local notifications fire when:
- A pending ticket result is polled and found
- After every successful OCR scan (confirmation)

---

## 7. Predictive Analysis Guide

Navigate to **Predict** (web) or the **Predict** tab 🔮 (mobile).

> ⚠️ **Disclaimer**: All predictions are for educational and entertainment purposes ONLY. They are NOT intended for gambling or financial decisions. Lottery draws are statistically independent random events.

### Three Models

#### Model 1 — Digit Frequency Analysis
- **Method**: Counts how often each number has appeared in recent draws, weighted by recency (exponential decay)
- **4D output**: Selects the most frequent digit for each of the 4 positions
- **TOTO output**: Selects the 12 most frequently occurring numbers (System 12)
- **Confidence**: ~0.01% (equivalent to random chance)

#### Model 2 — Hot & Cold Number Analysis
- **Method**: Identifies numbers that haven't appeared in a long time, measured against the expected gap; also tracks "hot" streaks
- **4D output**: Selects the most overdue digit per position
- **TOTO output**: Selects the 12 coldest (most overdue) numbers
- **Confidence**: ~0.01% — illustrates the Gambler's Fallacy

#### Model 3 — Odd & Even / Jackpot Pattern Analysis
- **Method**: Analyses the ratio of odd/even numbers and jackpot-range clusters across historical draws; selects numbers matching the most common patterns
- **4D output**: Picks digits matching the dominant odd/even positional pattern
- **TOTO output**: Selects 12 numbers matching the most frequent odd/even distribution
- **Confidence**: ~0.01–0.05%

### Reading TOTO System 12 Predictions
Each model produces a **System 12** TOTO prediction:
- **Primary (6 numbers)**: The "core" prediction — shown in purple
- **Supplementary (6 numbers)**: The additional System 12 numbers — shown in gold
- Together these form a valid System 12 entry (12 unique numbers, C(12,6) = 924 combinations)

### Click "About this model" (▼ toggle at bottom of each card) to see:
- Why the model was chosen
- Core assumptions
- Methodology details
- Evaluation approach
- Confidence indicators

---

## 8. Testing Each Feature

### Test 1: Ticket Upload & OCR
1. Start backend and web app
2. Go to http://localhost:5173/upload
3. Upload any clear image of a 4D or TOTO ticket
4. Verify: game type, draw date, numbers, bet type are shown
5. Check Firestore console for saved document

### Test 2: TOTO System Bet Expansion
1. Upload a TOTO System 7+ ticket photo
2. In the result card, verify `expandedCombinationCount` is shown
3. Open the ticket detail in History → verify expanded combinations list

### Test 3: Past Results
1. Start backend: `node server.js`
2. Go to http://localhost:5173/results
3. Click **Refresh Live** — verify 4D and TOTO data loads
4. If Singapore Pools blocks scraping: mock data is displayed (labelled "Demo data")

### Test 4: Result Checking
1. Upload an old ticket (draw date in the past)
2. Verify `resultStatus` updates immediately (won/not_won)
3. For a future ticket: verify status shows "Pending"
4. Wait for the hourly cron, or call `POST /api/results/check/:ticketId` manually

### Test 5: Predictive Analysis
1. Go to http://localhost:5173/predict
2. Verify 3 model cards load with 4D number + 12 TOTO balls each
3. Click **▼ About this model** toggle — verify all fields are present (why, assumptions, methodology, evaluation, confidence, disclaimer)
4. Click **Regenerate** — numbers should change (randomised from weighted data)

### Test 6: Notifications (Web)
1. Allow browser notification permission when prompted
2. Manually trigger via `POST /api/results/check/:ticketId` for a past ticket
3. If ticket won: browser push notification fires

### Test 7: Mobile Scan
1. Start ngrok: `npx ngrok http 3001`
2. Update API URLs in mobile source files
3. Run `npx expo start`
4. Open Expo Go → scan QR code
5. Tap Scan → Take Photo → photograph a ticket
6. Verify result card appears

---

## 9. Troubleshooting

### "Upload failed. Make sure backend is running."
- Verify backend is running on port 3001
- Check for CORS errors in browser console
- For mobile: ensure ngrok URL is correct and updated

### OCR returns no numbers
- Image may be blurry or low contrast
- Ensure ticket numbers are clearly visible
- Try increasing image brightness before uploading
- Backend logs show raw OCR text: `console.log('[upload] Raw OCR')`

### "Could not load tickets" (History page)
- Backend must be running
- Check Firestore rules allow reads
- Open browser console for specific error

### Firebase Storage (image upload)
- Image storage is disabled in this build (requires Firebase Blaze plan)
- Tickets save and function fully without images
- History cards display a game-type icon instead of a photo thumbnail

### Scraper returns mock data
- Singapore Pools may block direct scraping (bot detection)
- Mock data is automatically used as fallback
- This is expected behaviour — results are labelled "Demo data"
- For production: consider a licensed data feed or paid proxy

### Cron job not running
- Backend must remain running (don't stop the process)
- Cron runs every hour on the server
- To test immediately: call `POST /api/results/check/:ticketId`

### Expo push notifications not received
- Check notification permissions in device settings
- Physical device required (simulators may not receive push)
- Expo Go has limited background push support; use standalone build for production

### Port 3001 already in use
```bash
# Find and kill the process on Windows
netstat -ano | findstr :3001
taskkill /PID <pid> /F
```

---

## 10. Known Issues

| Issue | Status | Workaround |
|-------|--------|-----------|
| Singapore Pools scraper may be blocked | Known | Mock data fallback active |
| OCR accuracy varies with image quality | Known | Use high-res, well-lit photos |
| Firebase Storage disabled (requires Blaze plan) | Known | History shows game-type icon; all other features unaffected |
| Expo background polling limited in Expo Go | Known | Use standalone Expo build for full push |
| `(tabs)` folder renamed to `tabs` — may need router update | Fixed | Folder is now `app/tabs/` |
| TOTO System 12 expansion (924 combos) may be slow in Firestore | Minor | Stored async; no UI blocking |

---

## 11. Data Privacy & Security

### Data Collected
- Uploaded ticket images (stored in Firebase Storage)
- Extracted ticket data (numbers, dates, bet type)
- Device push notification tokens (stored in memory only)

### Data NOT Collected
- Personal identity information
- Financial account details
- Location data

### Security Practices
- `serviceAccountKey.json` is excluded from Git (listed in `.gitignore`)
- Firebase rules should restrict reads/writes to authenticated users in production
- ngrok URL changes each session — never commit it to source control
- All API calls use HTTPS in production

### Recommended Production Security
```
// Firebase Firestore rules (production)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tickets/{ticket} {
      allow read, write: if request.auth != null;
    }
    match /results_4d/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /results_toto/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Ethics Statement
This application is built for **educational and personal tracking purposes only**. It does not encourage, facilitate, or promote gambling. All predictive analysis features include clear disclaimers. The application does not provide odds, financial advice, or any guarantees of winning.

---

## 12. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        SGLottery System                         │
├────────────────┬───────────────────┬───────────────────────────┤
│   Web App      │   Mobile App      │      Backend API           │
│  (Vite+React)  │ (Expo+RN)         │   (Express + Node.js)     │
│                │                   │                           │
│  / Home        │  🏠 Home          │  POST /api/tickets/upload │
│  /upload       │  📷 Scan          │  GET  /api/tickets        │
│  /history      │  📋 History       │  GET  /api/tickets/:id    │
│  /results      │  📊 Results       │  DELETE /api/tickets/:id  │
│  /predict      │  🔮 Predict       │  GET  /api/results/4d     │
│                │                   │  GET  /api/results/toto   │
│                │                   │  POST /api/results/check  │
│                │                   │  GET  /api/predict        │
├────────────────┴───────────────────┴───────────────────────────┤
│                      Services Layer                            │
│  scraper.js     → Singapore Pools web scraping + fallback     │
│  combinations.js→ TOTO system bet expansion (C(n,6))         │
│  matcher.js     → Ticket vs result comparison                 │
│  predictor.js   → 3 statistical prediction models            │
├────────────────────────────────────────────────────────────────┤
│                    Data Layer (Firebase)                       │
│  Firestore: tickets, results_4d, results_toto                 │
│  Storage:   ticket images                                     │
└────────────────────────────────────────────────────────────────┘
│  Background Jobs                                              │
│  Cron (hourly): poll pending future-draw tickets              │
│  Cron (daily 23:00): refresh Singapore Pools results          │
└────────────────────────────────────────────────────────────────┘
```

---

## 13. API Reference

### POST /api/tickets/upload
Upload a ticket image for OCR processing.

**Request**: `multipart/form-data`, field: `ticket` (image file)

**Response**:
```json
{
  "success": true,
  "ticketId": "abc123",
  "gameType": "TOTO",
  "drawDate": "06/03/2026",
  "numbers": ["05  15  22  33  41  46"],
  "betType": "System 8",
  "systemSize": 8,
  "combinationCount": 28,
  "expandedCombinationCount": 28,
  "drawType": "past",
  "comparison": { "won": false, "matches": [], "prizeTier": null }
}
```

### GET /api/tickets
List ticket history.

**Query params**: `gameType` (4D|TOTO), `limit` (default 20)

### GET /api/results/4d
Get past 4D results.

**Query params**: `date` (DD/MM/YYYY), `limit` (default 20)

### GET /api/results/toto
Get past TOTO results.

**Query params**: `date` (DD/MM/YYYY), `limit` (default 20)

### POST /api/results/check/:ticketId
Manually trigger result check for a ticket.

### GET /api/predict
Generate predictions from all 3 models.

**Response**:
```json
{
  "predictions": [
    {
      "model": "Digit Frequency Analysis",
      "modelId": "frequency",
      "predicted4D": "3829",
      "predictedTOTO": [4, 7, 15, 22, 33, 36, 41, 44, 46, 47, 48, 49],
      "confidenceScore": 0.12,
      "why": "...", "assumptions": "...", "methodology": "...",
      "evaluation": "...", "confidence": "...", "disclaimer": "..."
    }
  ],
  "dataPoints": { "fourd": 50, "toto": 100 },
  "generatedAt": "2026-03-14T10:00:00.000Z",
  "disclaimer": "..."
}
```

---

*SGLottery User Manual — For internal use and assessment. Not for redistribution.*
