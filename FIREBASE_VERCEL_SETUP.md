# FIREBASE + VERCEL ENVIRONMENT SETUP GUIDE

## 1. Required Environment Variables

All variables below must be set in **two places**:
- `.env.local` (local development)
- Vercel Dashboard → Project → Settings → Environment Variables (production)

### Client-side vars (NEXT_PUBLIC_*)

These are safe to expose in the browser bundle.

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDIV4YZCWMU6HKnoSxFQa3Bas0W49PyCFg
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=starpads-automation.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=starpads-automation
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=starpads-automation.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=351115013979
NEXT_PUBLIC_FIREBASE_APP_ID=1:351115013979:web:095b64f2311c514fcbf47e
NEXT_PUBLIC_APP_URL=https://starpads-app.vercel.app/
```

### Server-side var (FIREBASE_SERVICE_ACCOUNT_B64)

This is used by the Firebase Admin SDK in API routes. **Never expose it to the browser.**

```
FIREBASE_SERVICE_ACCOUNT_B64=<base64-encoded-service-account-json>
```

---

## 2. Setting up FIREBASE_SERVICE_ACCOUNT_B64

### Step 1: Download the Firebase service account key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Open project: **starpads-automation**
3. Click **Project Settings** (gear icon) → **Service Accounts** tab
4. Click **Generate New Private Key** → **Generate Key**
5. A `.json` file downloads automatically

### Step 2: Convert JSON to Base64

**PowerShell (Windows):**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\Administrator\Downloads\starpads-automation-firebase-adminsdk-fbsvc-eed3b9dd8e.json"))
```

**WSL/Linux/macOS:**
```bash
base64 -w0 ~/Downloads/starpads-automation-firebase-adminsdk-fbsvc-eed3b9dd8e.json
```

Copy the entire output string — it will be ~1500–2000 characters ending with `==`.

### Step 3: Add to Vercel

The Vercel web UI sometimes has issues with long values. Use the CLI instead:

```bash
vercel env add FIREBASE_SERVICE_ACCOUNT_B64 production
```

Then paste the base64 string, press Enter, press Enter again to confirm.

To verify it was set:
```bash
vercel env ls
```

---

## 3. Adding ALL variables via Vercel CLI (recommended)

Run each command below, paste the value, press Enter, press Enter again.

```bash
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
# Paste: AIzaSyDIV4YZCWMU6HKnoSxFQa3Bas0W49PyCFg

vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production
# Paste: starpads-automation.firebaseapp.com

vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production
# Paste: starpads-automation

vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production
# Paste: starpads-automation.firebasestorage.app

vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production
# Paste: 351115013979

vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production
# Paste: 1:351115013979:web:095b64f2311c514fcbf47e

vercel env add NEXT_PUBLIC_APP_URL production
# Paste: https://starpads-app.vercel.app/

vercel env add FIREBASE_SERVICE_ACCOUNT_B64 production
# Paste: the base64 string from Step 2
```

After all variables are set, redeploy:
```bash
vercel --prod
```

---

## 4. How the code uses these variables

### Client SDK (`src/lib/firebase.ts`)
- Reads `NEXT_PUBLIC_FIREBASE_*` vars to initialize Firebase in the browser
- Used for: sign-in, session persistence, Firestore reads from client

### Admin SDK (`src/lib/firebase-admin.ts`)
- Reads `FIREBASE_SERVICE_ACCOUNT_B64`, decodes it from base64 to JSON
- Uses it as the service account credential for Admin SDK
- Used for: creating users (`/api/create-user`), server-side Firestore access

### Sign-up flow
```
Signup form → POST /api/create-user → Admin SDK creates Firebase Auth user
                                     → writes userRoles/{uid} to Firestore
                                     → returns success
```

### Sign-in flow
```
Login form → signInWithEmailAndPassword() → client SDK (no server needed)
```

This is why sign-in works but sign-up fails when `FIREBASE_SERVICE_ACCOUNT_B64` is missing.

---

## 5. Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| Sign-up returns 500 | `FIREBASE_SERVICE_ACCOUNT_B64` not set in Vercel | Add via CLI, redeploy |
| Base64 string too long for Vercel UI | Web form field limit | Use `vercel env add` CLI instead |
| "Invalid PEM" error | Base64 decoded to corrupted JSON | Re-download service account key and re-encode |
| Local sign-up works, Vercel doesn't | Vercel env vars != `.env.local` | Add all vars via CLI, redeploy |

---

## 6. Updating the service account key

If the key ever expires or is rotated:
1. Download the new JSON from Firebase Console
2. Re-encode to base64
3. Update both `.env.local` and Vercel env vars
4. Redeploy
