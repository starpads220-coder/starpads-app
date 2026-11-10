# Production-stage harmonization audit

## Canonical source

The Targets screen is now backed by `src/lib/production-stages.ts`. Its exact ordered list is:

1. STG-01 — Cutting & Measuring
2. STG-02 — Sewing inner (middle)
3. STG-03 — Sewing outer (top layer)
4. STG-04 — Overlocking
5. STG-05 — Pouch making and cutting
6. STG-07 — Checking
7. STG-08 — Holling
8. STG-09 — Pinning and Folding
9. STG-10 — Packaging

`STG-06` is not canonical. It was the second half of the old split pouch operation and is migrated into STG-05 with a historical `MAKING` component marker.

## Before-change stage-by-stage audit

| Location | Stage found before | Canonical stage | Match | Mismatch | Required fix |
|---|---|---|---|---|---|
| Targets | STG-01 Cutting & measuring material variants | STG-01 Cutting & Measuring | Yes | — | Use shared label |
| Targets | STG-02 Sewing inner (middle) | STG-02 Sewing inner (middle) | Yes | — | Use shared label |
| Targets | STG-03 Sewing outer (top layer) | STG-03 Sewing outer (top layer) | Yes | — | Use shared label |
| Targets | STG-04 Overlocking | STG-04 Overlocking | Yes | — | Use shared label |
| Targets | STG-05 Pouch making & cutting plus hidden STG-06 | STG-05 Pouch making and cutting | No | Split stage and name | Remove paired STG-06 and use one STG-05 |
| Targets | STG-07 Checking | STG-07 Checking | Yes | — | Use shared label |
| Targets | STG-08 Holling | STG-08 Holling | Yes | — | Use shared label |
| Targets | STG-09 Pinning/Folding activity rows | STG-09 Pinning and Folding | Yes | — | Use shared label |
| Targets | STG-10 Packaging | STG-10 Packaging | Yes | — | Use shared label |
| Production dropdown | STG-01 Cutting & Measuring | STG-01 Cutting & Measuring | Yes | — | Centralize |
| Production dropdown | STG-02 Sewing Inner [Middle] | STG-02 Sewing inner (middle) | No | Name/case | Replace from canonical source |
| Production dropdown | STG-03 Sewing Outer [TopLayer] | STG-03 Sewing outer (top layer) | No | Name/spelling | Replace from canonical source |
| Production dropdown | STG-04 Overlocking | STG-04 Overlocking | Yes | — | Centralize |
| Production dropdown | STG-05 Pouch Cutting | STG-05 Pouch making and cutting | No | Name and split | Merge operation |
| Production dropdown | STG-06 Pouch Making | No canonical stage | No | Extra/split | Remove and migrate |
| Production dropdown | STG-07 Checking | STG-07 Checking | Yes | — | Centralize |
| Production dropdown | STG-08 Holling | STG-08 Holling | Yes | — | Centralize |
| Production dropdown | STG-09 Pinning and Folding | STG-09 Pinning and Folding | Yes | — | Centralize |
| Production dropdown | STG-10 Packaging | STG-10 Packaging | Yes | — | Centralize |
| WIP | STG-01 creates cut material | STG-01 | Yes | — | Preserve |
| WIP | STG-02 consumes fleece/flannel and creates inner | STG-02 | Yes | — | Preserve |
| WIP | STG-03 consumes inner/PUL and creates full pad | STG-03 | Yes | — | Preserve |
| WIP | STG-04 consumes full pad and creates overlocked pad | STG-04 | Yes | — | Preserve |
| WIP | STG-05 creates cut pouch only | STG-05 combined pouch | No | Split behavior | New STG-05 creates completed pouch |
| WIP | STG-06 consumes cut pouch and creates completed pouch | No canonical stage | No | Extra/split | Preserve only as migrated historical component |
| WIP | STG-07 checking movement | STG-07 | Yes | — | Preserve |
| WIP | STG-08 holling movement | STG-08 | Yes | — | Preserve |
| WIP | STG-09 pinning/folding movement | STG-09 | Yes | — | Preserve |
| WIP | STG-10 consumes 3 pads and 1 pouch per pack | STG-10 | Yes | — | Preserve |
| Reports | STG-01 Cutting | STG-01 Cutting & Measuring | No | Abbreviated name | Use shared label helper |
| Reports | STG-02 Sewing Inner [M] | STG-02 Sewing inner (middle) | No | Abbreviated name | Use shared label helper |
| Reports | STG-03 Sewing Outer [TL] | STG-03 Sewing outer (top layer) | No | Abbreviated name | Use shared label helper |
| Reports | STG-04 Overlocking | STG-04 Overlocking | Yes | — | Centralize |
| Reports | STG-05 Pouch Cutting | STG-05 Pouch making and cutting | No | Split/name | Use shared label helper |
| Reports | STG-06 Pouch Making | No canonical stage | No | Extra | Map historical display to STG-05 |
| Reports | STG-07 Checking | STG-07 Checking | Yes | — | Centralize |
| Reports | STG-08 Holling | STG-08 Holling | Yes | — | Centralize |
| Reports | STG-09 Pinning and Folding | STG-09 Pinning and Folding | Yes | — | Centralize |
| Reports | STG-10 Packaging | STG-10 Packaging | Yes | — | Centralize |
| Seed data | STG-01 Cutting | STG-01 Cutting & Measuring | No | Name | Replace seed list |
| Seed data | STG-02 Sewing Inner [Middle] | STG-02 Sewing inner (middle) | No | Name/case | Replace seed list |
| Seed data | STG-03 Sewing Outer [TopLayer] | STG-03 Sewing outer (top layer) | No | Name/spelling | Replace seed list |
| Seed data | STG-04 Overlocking | STG-04 Overlocking | Yes | — | Retain |
| Seed data | STG-05 Pouch Making | STG-05 Pouch making and cutting | No | Name/meaning | Replace |
| Seed data | STG-06 Checking | No canonical stage | No | Shifted/extra | Remove |
| Seed data | STG-07 Holling | STG-07 Checking | No | Shifted name | Correct |
| Seed data | STG-08 Pinning and Folding | STG-08 Holling | No | Shifted name | Correct |
| Seed data | STG-09 Packaging | STG-09 Pinning and Folding | No | Shifted name/unit | Correct |
| Seed data | STG-10 missing | STG-10 Packaging | No | Missing | Add |

Payments, worker views, dashboards and analytics consumed the old shared `STAGE_LABELS`; their mismatches were therefore identical to the Production dropdown rows above. Stock logic used STG-10 and remains correctly attached to Packaging.

## After-change verification matrix

Every location below consumes the canonical module directly or through the compatibility re-export in `src/types/index.ts`.

| Location | STG-01 | STG-02 | STG-03 | STG-04 | STG-05 | STG-07 | STG-08 | STG-09 | STG-10 |
|---|---|---|---|---|---|---|---|---|---|
| Targets screen/logic | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Production dropdown | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| WIP movement | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Stock/batch logic | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Dashboards/charts | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Production reports | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Worker/payment displays | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Types/validation | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Seed/config scripts | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

## WIP movement retained

- STG-01 adds cut fleece/microfiber, flannel or PUL.
- STG-02 consumes fleece and flannel and creates a stitched inner piece.
- STG-03 consumes the stitched inner and PUL and creates a fully stitched pad.
- STG-04 consumes the fully stitched pad and creates an overlocked pad.
- STG-05 creates one completed pouch in the new combined operation. Migrated legacy CUTTING and MAKING records retain their original two-step movements.
- STG-07 consumes an overlocked pad and creates a checked pad.
- STG-08 consumes a checked pad and creates a holed pad.
- STG-09 Pinning consumes a holed pad; Folding consumes a pinned pad.
- STG-10 consumes three folded pads and one completed pouch and creates one finished pack.

The selector for a batch is rendered only for STG-10. Stages 1–9 use the global WIP ledger and submit an empty `batchRef`; STG-10 requires a real batch in both the UI and Firestore rules.

## Migration and rollback

`scripts/migrate_stage_harmonization.js` backs up every affected document under `stageHarmonizationBackups/{runId}/records`, maps historical STG-06 records into STG-05 with a `MAKING` marker, marks old STG-05 records as `CUTTING`, clears non-STG-10 batch references, rebuilds `wipBalances/GLOBAL`, and removes the obsolete stored STG-06 definition. It is dry-run by default. Every applied run prints its rollback command.

## Automated gates

- `npm run check:stages` fails if the canonical order/name changes unexpectedly, a duplicate stage-label list returns, or STG-06 is used outside the explicit legacy migration boundary.
- `npm run check:wip` simulates a complete pad/pouch flow through every canonical stage and verifies the migrated historical pouch behavior.
