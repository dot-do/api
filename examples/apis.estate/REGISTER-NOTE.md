# REGISTER-NOTE — apis.estate (register row `real-estate`), 2026-08-23

Facts and analysis only (write-as-if-produced). No ranking is implied by
anything below [CONVICTION: the register is unordered].

## Shared-face collision: LienWaiver (real-estate × construction)

The **lien-waiver record type is literally shared** between this row and the
construction row (SC #10 — the closing-packet grain names the lien waiver as
a packet document; SC #13 — the construction payment-application chain names
the same waiver as its own THE-record). A search of the register
(`2026-08-23-full-economy-property-register.json`) found **no
projection-primacy ruling** for the shared type as of this build.

Per the batch watch list, the Noun is therefore built **under this row's key**
(`real-estate`): `LienWaiver` is served at `/lien-waivers` on apis.estate as
labeled example data, bound `generated`, with the collision disclosed in the
route summary, the MCP tool description, and the served collection note.
**Nothing shared is claimed**: this build asserts no ownership of the
lien-waiver type, coordinates nothing on behalf of the construction row, and
does not reserve the record shape. When a projection-primacy ruling lands,
whichever row is ruled primary owns the canonical schema; this collection
conforms to it or re-derives from it at that time.

No construction wave-zero build exists in this repo as of 2026-08-23 (no
`draft/construction-wave0` branch), so no live surface collides today — the
collision is a register-grain fact, recorded here so the ruling is asked for
rather than silently pre-empted.

## Vacancy-at-breadth verdict (recorded fact, not a ranking)

The register row records that the closing-document layer carries one of only
three standing vacancy-at-breadth verdicts in the cascade (closing docs,
alongside the EPCIS rail and settlement): *no agent-first closing-packet API
evidenced* (SC #10; coverage-map white-space #7). Recorded here verbatim as a
**verdict fact** — it implies no ordering of rows and no build priority
[CONVICTION: no ranking].

## Permanent exclusion carried into the build

The money/escrow layer is excluded by licensure and gated on the A1
settlement module (platform.do). Mechanically enforced in this build: the
`escrow` query scope answers BLOCKED 403; escrow/disbursement/wire document
kinds are refused at the headless assembly door; no packet carries a
settlement statement, disbursement, or wire instruction; the §7.4 money-event
seam exists for metered-call settlement only and can never fire for escrow
movement on this substrate.
