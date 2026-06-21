# FIREBASE AUTH SETUP — ENGINEERING PLAN

> Template Reference: `master_prompt_advanced.md` | App: Star Durable Pads

---

## 1. TASK

**Primary Objective:** Resolve `FirebaseError: auth/invalid-api-key` crash on app startup by ensuring Firebase is only initialized when valid credentials exist, and provide a setup wizard / admin account creation flow.

**Secondary Objectives:**
- Add a `.env.local` validation check at startup so missing config is surfaced as a user-friendly message, not a cryptic Firebase error
- Create Firebase project setup documentation inline (in-app help page)
- Add a first-run admin account creation flow that creates the Firebase Auth user + Firestore `userRoles` document
- Protect against the app crashing entirely when Firebase config is missing

**Definition of Done:**
- [ ] App loads without crashing when Firebase env vars are missing (shows setup guide)
- [ ] App connects to Firebase Auth when valid env vars are present
- [ ] First-time setup page at `/setup` guides user to create admin account
- [ ] Admin account creation writes both Firebase Auth user + `userRoles/{uid}` document
- [ ] Login page works end-to-end: sign in → redirect to `/production`
- [ ] Zero TypeScript errors

---

## 2. CONTEXT

**Project / App Overview:** Star Durable Pads — a Next.js production management platform for a reusable sanitary pad manufacturer. Uses Firebase Auth (email/password) for authentication and Firestore for all data.

**Tech Stack:**
- Next.js 16.2.9 with Turbopack
- React 19
- TypeScript 5.x (strict mode)
- Firebase v12 (Firebase Auth, Firestore)
- Tailwind CSS v4
- Recharts for charts

**Files Involved:**
| File | Role |
|------|------|
| `src/lib/firebase.ts` | Firebase client initialization — reads `NEXT_PUBLIC_FIREBASE_*` env vars |
| `src/lib/auth-context.tsx` | Auth provider — calls `onAuthStateChanged` on mount |
| `src/app/layout.tsx` | Root layout — wraps app in `<AuthProvider>` |
| `src/app/login/page.tsx` | Login form — calls `signInWithEmailAndPassword` |
| `src/app/setup/page.tsx` | **NEW** — First-run setup page with admin account creation |
| `.env.local` | **NEEDS CREATION** — Firebase project credentials |

**Current Behavior:**
1. App starts dev server at `localhost:3000`
2. Root layout mounts `<AuthProvider>`
3. `AuthProvider` calls `onAuthStateChanged(auth, ...)` immediately
4. `auth` is created by `getAuth(app)` in `firebase.ts`
5. `app` is created by `initializeApp(firebaseConfig)` with empty/missing env vars
6. Firebase Auth throws `auth/invalid-api-key`
7. Entire app crashes with uncaught error in the browser

**Expected Behavior:**
1. App loads without crashing regardless of Firebase config state
2. If env vars are missing, show a setup guide page instead of the app
3. If env vars are present, initialize Firebase and proceed to login/app
4. First-time setup page creates admin account + role document
5. All auth flows (login, logout, session persistence) work end-to-end

**Failure Mode:**
```
Error: FirebaseError: Firebase: Error (auth/invalid-api-key).
Stack trace → getAuth() → initializeAuth() → Auth component instantiation
          → _assert() → createErrorInternal()
Triggered by: RootLayout rendering <AuthProvider>, which calls onAuthStateChanged(auth)
Root cause: NEXT_PUBLIC_FIREBASE_API_KEY is undefined/empty string
```

---

## 3. ISSUE LIST

- **[BUG] App crashes on startup from Firebase auth/invalid-api-key**
  - Symptom: White screen with console error, app unusable
  - Root cause: Firebase initialized with empty env vars (no `.env.local`)
  - Impact: CRASH — blocks all users from accessing the app
  - Affected scope: Every first-time visitor on any device

- **[FEATURE] No graceful handling of missing Firebase config**
  - Symptom: No user-friendly message — just a console stack trace
  - Root cause: `firebase.ts` unconditionally calls `initializeApp()`
  - Impact: UX degradation — non-technical user has no idea what's wrong
  - Affected scope: All new deployments

- **[FEATURE] No first-run admin account creation flow**
  - Symptom: After Firebase is configured, there's no way to create the first admin user
  - Root cause: Only login form exists, no registration/signup
  - Impact: App is unusable after initial setup — user cannot create their account
  - Affected scope: Every new deployment

- **[FEATURE] Auth provider initialization too early**
  - Symptom: `onAuthStateChanged` fires before any user interaction
  - Root cause: `auth-context.tsx` imports `auth` at module level, which triggers Firebase init
  - Impact: App crashes before user can see anything
  - Affected scope: All users

---

## 4. REQUEST

**Deliverable(s):**
1. `src/lib/firebase.ts` — Add env var validation; only init Firebase when credentials exist
2. `src/lib/auth-context.tsx` — Handle null Firebase state; defer auth init
3. `src/app/setup/page.tsx` — First-run setup page (new file)
4. `.env.local.example` — Already exists; verify it's complete
5. `src/app/login/page.tsx` — Add redirect to setup if no admin exists

**Functional Requirements:**
- [ ] `firebase.ts` exports a function `getFirebase()` that returns null if env vars are missing
- [ ] `auth-context.tsx` handles `auth === null` gracefully (shows "not configured" state)
- [ ] Setup page at `/setup` allows creating the first admin user:
  - Email + password form
  - On submit: creates Firebase Auth user via Admin SDK API or client `createUserWithEmailAndPassword`
  - Writes `userRoles/{uid}` document with role: "ADMIN"
  - Signs in the new admin
- [ ] Login page redirects to `/setup` if no admin exists (check via query to `userRoles` collection)
- [ ] `.env.local.example` documents all 6 required Firebase env vars

**Non-Functional Requirements:**
- [ ] Zero new TypeScript errors introduced
- [ ] No Firebase code runs on the server in `layout.tsx` (avoid server-side Firebase init)
- [ ] Auth state persists correctly across page refreshes
- [ ] Environment variables validated before any Firebase call

**What NOT to change:**
- Do not modify the NavBar, KpiCard, StatusBadge, or DataTable components
- Do not change the Firestore data model in `src/types/index.ts`
- Do not alter the production, storage, sales, expenses, or analytics pages

---

## 5. CONSTRAINTS & RULES

**Coding Standards:**
- Firebase client SDK only used in browser (`typeof window !== "undefined"`)
- Admin SDK (`firebase-admin`) only used in API routes / server components
- All env var validation happens at module init, not in component render
- Error messages must be user-friendly, not raw Firebase error codes

**Security:**
- Admin API key only used on server-side via Firebase Admin SDK
- Client-side Firebase config is safe to expose (API key is a public identifier)
- `createUserWithEmailAndPassword` should only be available on the setup page, not exposed as a general registration feature

**Compatibility:**
- Must work with both Turbopack dev and production builds
- Must not break hot module reload

---

## 6. TECHNICAL DEEP-DIVE

**Data Flow:**
```
App starts
  → layout.tsx renders <AuthProvider>
  → AuthProvider calls useFirebase() to check if config exists
  → If no config: render <FirebaseSetupGuide>
  → If config exists: render children (login or app pages)

User navigates to /setup (first run):
  → Form: email + password
  → POST /api/setup-admin (Firebase Admin SDK creates auth user)
  → Writes userRoles/{uid} with role: ADMIN
  → Signs in client-side
  → Redirects to /production
```

**Firebase Config Validation:**
```typescript
const REQUIRED_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

function isFirebaseConfigured(): boolean {
  return REQUIRED_KEYS.every((key) => {
    const val = process.env[key];
    return typeof val === "string" && val.length > 0;
  });
}
```

**Key API Considerations:**
- Firebase v12: `getAuth()` can throw if API key is invalid — must wrap in try/catch
- Firebase Auth session is persisted to IndexedDB by default (no action needed)
- Admin SDK requires service account JSON — use `FIREBASE_SERVICE_ACCOUNT_B64` env var
- The setup API route must use Admin SDK to bypass `createUserWithEmailAndPassword` being disabled in Firebase console (it's off by default)

---

## 7. EXEMPLAR

**Current broken pattern (firebase.ts):**
```typescript
// App crashes immediately because getAuth() throws
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
export { app, auth, db };
```

**Fixed pattern:**
```typescript
export function getFirebase() {
  if (!isConfigured) return { app: null, auth: null, db: null };
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    return { app, auth: getAuth(app), db: getFirestore(app) };
  } catch {
    return { app: null, auth: null, db: null };
  }
}
```

---

## 8. EDGE CASES & ERROR HANDLING

- [ ] All 6 env vars are present but one is incorrect (e.g. wrong project ID) → Firebase throws auth error → wrap in try/catch, surface as "Firebase configuration is invalid"
- [ ] User navigates to `/setup` after admin already exists → show "Admin already exists; please log in" with link to login
- [ ] Admin creation fails (email already exists) → show error message
- [ ] Network error during signup → retry button
- [ ] `.env.local` is created but server needs restart → Turbopack handles hot-reload for env vars, but document that a restart may be needed for `process.env` updates
- [ ] User clears browser data → auth session lost → redirect to login
- [ ] Setup page accessed while not on first run → check if any admin exists in `userRoles` collection
- [ ] Password < 6 characters → Firebase Auth requires 6+ chars, validate client-side

---

## 9. TESTING REQUIREMENTS

**Manual QA Checklist:**
- [ ] App shows setup guide page when `.env.local` is missing
- [ ] App loads normally when valid `.env.local` exists
- [ ] Setup page creates admin user successfully
- [ ] Created admin can log in at `/login`
- [ ] Login error with wrong password shows user-friendly message
- [ ] After login, user is redirected to `/production`
- [ ] Logout works and redirects to home
- [ ] Page refresh preserves auth session
- [ ] Invalid Firebase credentials show "configuration invalid" message (not stack trace)

---

## 10. PERSONA

You are a Senior Next.js + Firebase Engineer with 6+ years of production experience building authentication systems. You specialize in Firebase Auth integration, error boundary design, and graceful degradation patterns. You write code that never exposes raw Firebase error codes to end users. You anticipate config issues at every layer (env vars, Firebase project settings, network) and handle each with a specific, user-friendly response.

---

## 11. OUTPUT FORMAT

**Primary Deliverable Format:** `Full rewritten files` — each file produced in full, ready to copy-paste.

**Supplementary Output:**
1. **CHANGE LOG** — Bullet-point summary of every change
2. **RISK FLAGS** — Assumptions and potential issues
3. **FOLLOW-UP TASKS** — What to do after this fix

---

## 12. TONE

Professional, concise, engineering-focused. No filler. Direct about tradeoffs. Surface risks proactively.
