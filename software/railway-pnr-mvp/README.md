# PNR Coach Ledger — hackathon MVP

A minimal prototype for the flow: **IRCTC already generates the PNR at booking
time → the coach attendant looks up passenger name, coach, and seat by that
PNR.** No IRCTC integration is built or needed — this app seeds realistic
demo PNR data (following the real IRCTC PNR digit structure) so the
attendant/admin/passenger screens have something real to work against.

This is a separate, standalone project — not part of SRLMS.

## Stack
- Backend: Node.js, Express, MongoDB (Mongoose), JWT auth
- Frontend: React + Vite + Tailwind
- **QR codes**: [`qrcode`](https://www.npmjs.com/package/qrcode) (npm) — generates real PNG images
  server-side. Each QR encodes a small JSON payload (LID, item type, region,
  QR code string) so scanning it shows the item's data directly, not just a
  bare code. Images are generated on demand (`GET /linen-ops/qr/:code`), not
  stored in Mongo, to keep documents small.

## 1. Start MongoDB locally
Make sure `mongod` is running locally (default port 27017). You can browse
the data afterward in **MongoDB Compass** using:
```
mongodb://127.0.0.1:27017/railway-pnr-tracker
```

## 2. Backend
```bash
cd backend
npm install
npm run seed   # wipes & creates demo admin, 3 coach attendants, 30 PNR records, 6 passenger logins
npm run dev    # starts the API on http://localhost:5050
```
The seed script prints every login (empId/mobile + password) and each
demo passenger's PNR to the console — copy those for testing.

## 3. Frontend
```bash
cd frontend
npm install
npm run dev    # http://localhost:5173 (proxies /api to :5050)
```

## Roles
- **Admin** (`empId` login) — sees every PNR across all 3 seeded coaches (B1/3A, B2/2A, S4/SL), filterable by coach; also has full access to the Linen Ops and gate-alert screens.
- **Coach attendant** (`empId` login) — sees only their assigned coach's manifest (PNR, passenger, seat, berth), can mark a passenger "boarded", and runs the assign/unassign flow.
- **Passenger** (mobile login) — looks up their own ticket by PNR, including linen status, and can self-return their kit.
- **Linen operator** (`empId` login, e.g. `LOP001`) — the **private laundry contractor's own account**, with its own separate dashboard (`/linen-ops`) for registering RFID items, assembling kits, and printing QR labels. Completely separate from the railway's PNR dashboard — a coach attendant never registers linen, they only ever scan the QR codes this dashboard produces.
- **Railway officer** (`empId` login, e.g. `RLY001`) — a **third, separate dashboard** (`/railway`) for the railway department itself: monitoring, passenger/linen search, incident review, the blacklist approval workflow, CSV reports, and the audit log. It only ever *reads* — it has no endpoint that registers RFID, creates a LID, or generates a linen-operator QR code, matching the doc's separation rule.

## Linen Ops dashboard (private contractor)

Log in as `LOP001` / `LinenOps@123` (or `ADM001`, which can also reach it).
This is a **separate dashboard** (`/linen-ops`) from the railway's PNR
screens — it models the private laundry contractor's own system:

- **Create New Kit** — the guided 5-step flow from your reference doc:
  simulate an RFID scan for Bed Sheet 1 → Bed Sheet 2 → Blanket → Pillow
  Cover → Face Towel (each gets its own LID + individual QR the instant
  it's registered), then "Generate Kit QR" once all 5 are verified. The
  Kit QR groups them — it doesn't replace their individual QR codes.
- **Register Pillow** — same idea, one item, kept separate from any kit
  since it physically can't fit in the sealed bag.
- **Scan / Find** — look up anything by LID, item QR, or kit QR.
- **Inventory** / **Kits** — browse everything registered, filterable by
  status.

The coach attendant's assign flow (`/attendant`) only ever *consumes*
QR codes generated here — it has no way to register new linen itself,
matching the real separation between the contractor and the railway.

## Railway Department dashboard (monitoring & oversight)

Log in as `RLY001` / `Railway@123` (or `ADM001`). A third, separate dashboard
(`/railway`) — it consumes data the other two systems produce, and never
touches RFID/QR registration:

- **Overview** — KPI cards (passengers, linen issued/returned/checked out,
  missing items, open alerts, active blacklist) plus a live activity feed
  pulled from the audit log.
- **Passengers** — search by PNR/name/train/coach; expand a row for full
  linen history, related incidents, and a blacklist-match warning if one
  exists.
- **Linen Tracking** — read-only search/filter over every registered item
  (same data as the Linen Ops inventory, no register/create actions).
- **Missing & Alerts** — the `TheftIncident` feed with an Open / Under
  Review / Resolved workflow, and a "Propose blacklist" action straight
  from an incident.
- **Blacklist** — the controlled review workflow from the doc: a record
  starts `under_review`; an officer has to **Approve** (→ `active`) or
  **Reject** it — nobody can one-click ban a passenger. Active records can
  later be resolved/cleared.
- **Reports** — CSV export for linen inventory, missing linen, blacklist,
  audit log, and passengers. Every export itself gets logged.
- **Audit Log** — append-only trail of every assign/return, gate alert,
  incident status change, blacklist decision, and report export, with who
  did it and when.

**Not built this pass** (flagging honestly rather than padding it out):
"Trains & Coaches" and "Settings" as their own pages, a separate
"Live Operations" page (folded into Overview's activity feed instead), and
the doc's NON_PNR / EXTRA_REQUEST assignment flows — the current system
only models PNR-based assignment. The `BlacklistRecord` and `AuditLog`
models plus the review workflow are real and wired end-to-end; the parts
above are the pieces I scoped out rather than build shallowly.

## Linen kit assignment (the RFID/LID flow)

RFID numbering mirrors your ESP8266 + RC522 firmware exactly, so software-generated
demo tags are format-identical to what the hardware will eventually write:

```
LID = [1-digit region][1-digit linen type][8-digit unique] = 10 digits
region 8 = Mumbai · linen 1=Bed Sheet 1, 2=Bed Sheet 2, 3=Pillow,
           4=Blanket, 5=Pillow Cover, 6=Face Towel
```
See `backend/utils/lidGenerator.js`.

The seed script creates one **sealed kit** (`KIT-000001`, `KIT-000002`, …) per
passenger plus 8 spares. Each kit bundles 5 pre-linked LID-tagged items —
2 bed sheets, 1 blanket, 1 pillow cover, 1 towel — exactly like the sealed
paper bag from the laundry. Each kit also has a matching standalone
**pillow** (`PIL-000001`, …), since the pillow ships loose and gets its own
QR/RFID.

On the Coach Attendant dashboard, "Assign linen kit" walks the real flow:
1. Scan the kit QR (bag) → shows the 5 linked items.
2. Scan the pillow QR → shows the pillow's LID.
3. Enter the passenger's PNR — normally decoded from the ticket QR; type it
   manually if the ticket has none.
4. **Link** → all 6 items are marked `assigned` and tied to that PNR. The
   kit's status flips to `assigned` (bag is now torn open and can't be
   reused). This is reflected instantly in the manifest's "Linen" column
   and on the passenger's own ticket view.

Browse `linenitems` / `linenkits` in MongoDB Compass to see the raw tag
data and status transitions.

## Unassigning linen

Two ways to release a kit, matching the real-world constraint that the
paper bag is already gone by return time:

- **Itemized** (Coach Attendant / Admin only): scan each of the 6
  individual item LIDs one by one (5 ex-kit items + pillow — no more bag
  QR shortcut), enter the PNR, and confirm. If some items don't get
  scanned back, the PNR stays "assigned" for just those missing pieces —
  the response lists what's outstanding so the attendant knows exactly
  what's still checked out.
- **Quick** (Coach Attendant, Admin, *or the passenger themself*): just the
  PNR. Since every item LID is already linked to that PNR, everything
  releases in one call. This is what lets a passenger self-return if the
  attendant hasn't come by — it shows up on their own ticket page as a
  "Return / unassign my linen" button while their kit is still checked
  out.

Every return records **who** did it (`returnedByRole` + `returnedById`)
and **when**, on `PnrRecord.linenAssignment`.

## Exit-gate theft detection

There's no physical gate reader yet, so the Admin dashboard includes a
**gate scan simulator**: enter any item LID + a gate ID and it behaves
exactly like a real RFID/AM exit-gate reader would —

- If the item is still `assigned` (never returned) → it's flagged as a
  theft incident, shown in a live alert feed with the PNR, passenger name,
  and coach, and the item's status flips to `missing`.
- If it's already `returned` → gate passage is normal, no alert.

Swap the simulator's POST for a real gate webhook later without touching
this logic.

## What's intentionally out of scope for this pass
- No real camera/QR scanning or physical RFID hardware integration yet —
  the "scan" fields are manual text entry / a "Simulate RFID scan" button
  standing in for a scanner, ready to swap for real scan input later.
- No OTP — passenger login uses a plain password for demo speed.
- Late-return liability ("attendant is responsible if the sweep happens
  after the passenger already left") isn't computed automatically — that
  needs a "passenger deboarded" event this app doesn't model yet. What's
  captured now (`returnedByRole`, `returnedById`, `returnedAt`) is the raw
  data that rule would need; the rule itself can be layered on later once
  you've settled exactly when a passenger counts as "gone".

## A note on testing this pass
I couldn't spin up a live MongoDB in the sandbox I built this in — no
network route to MongoDB's own servers, and Ubuntu no longer ships a
`mongodb-server` package. What I *did* verify directly: every backend file
(including the new `railway.js`, `BlacklistRecord`, `AuditLog`, and audit
hooks added into `linen.js`/`gates.js`) syntax-checks and dry-loads
cleanly together, and the frontend builds clean with `vite build`. The
seed script now also creates one demo incident + one `under_review`
blacklist record + matching audit rows, so the Railway dashboard has real
data to show the first time you log in — but the actual Mongo read/write
path needs `npm run seed` on your machine to confirm.
