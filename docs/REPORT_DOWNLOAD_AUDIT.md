# Report download audit

All report cards use the shared `ReportCard` error/loading UI, `/api/reports`, `downloadResponse`, and `downloadBlob`. Empty or non-file responses are rejected, server errors are shown to the user, object URLs remain alive for mobile/Safari/PWA downloads, and generated responses now use `private, no-store` plus `nosniff` headers.

| Report | Route screen | Shared download | Error feedback | Stage source | Code/build status |
|---|---|---|---|---|---|
| Production | production | Yes | Yes | Canonical stage helper | Pass |
| Storage / stock / WIP | storage | Yes | Yes | STG-10 semantics retained | Pass |
| Sales | sales | Yes | Yes | Not stage-based | Pass |
| Expenses | expenses | Yes | Yes | Not stage-based | Pass |
| Analytics | analytics | Yes | Yes | Canonical production data | Pass |
| Payments | payments | Yes | Yes | Shared stage labels in labor details | Pass |
| Worker | worker | Yes | Yes | Shared stage labels | Pass |
| NSSF | nssf | Yes | Yes | Not stage-based | Pass |
| PAYE | payee | Yes | Yes | Not stage-based | Pass |
| Payment receipt | dedicated receipt API/client PDF | Yes | Yes | Shared stage labels | Pass |
| Accounts statements | client PDF generation | Yes | Yes | Not stage-based | Pass |

Live data generation could not be completed during the audit because Firestore returned `RESOURCE_EXHAUSTED: Quota exceeded`. Static coverage, TypeScript, PDF routing and production build verification remain automated; live report downloads must be rechecked after the Firestore quota resets.
