# Implementation Plan: mozzarella-96056 - Content Requests

## Task ID
**mozzarella-96056**

## Description
Content Requests - a page that lets users post requests with USDC bounties and others claim and fulfill them.

**Note:** Points/token system deferred to future Pepperoni integration task.

---

## Database Migration: `004_content_requests_bounty.sql`

```sql
-- Add bounty fields to content_requests
ALTER TABLE content_requests
  ADD COLUMN bounty_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN bounty_currency TEXT DEFAULT 'USDC',
  ADD COLUMN claimed_by UUID REFERENCES profiles(id),
  ADD COLUMN claimed_at TIMESTAMPTZ,
  ADD COLUMN deadline TIMESTAMPTZ,
  ADD COLUMN is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN priority TEXT DEFAULT 'normal';

-- Add request_id to content for linking fulfilled content
ALTER TABLE content
  ADD COLUMN fulfills_request_id UUID REFERENCES content_requests(id);

-- Request claims (who is working on a request)
CREATE TABLE request_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES content_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  status TEXT DEFAULT 'active' NOT NULL, -- 'active', 'completed', 'abandoned', 'expired'
  UNIQUE(request_id, user_id)
);

-- Indexes
CREATE INDEX idx_requests_bounty ON content_requests(bounty_amount DESC);
CREATE INDEX idx_requests_deadline ON content_requests(deadline);
CREATE INDEX idx_content_fulfills_request ON content(fulfills_request_id);
CREATE INDEX idx_request_claims_request ON request_claims(request_id);
CREATE INDEX idx_request_claims_user ON request_claims(user_id);

-- RLS for claims
ALTER TABLE request_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Claims are viewable by everyone" ON request_claims
  FOR SELECT USING (true);
CREATE POLICY "Users can create own claims" ON request_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own claims" ON request_claims
  FOR UPDATE USING (auth.uid() = user_id);
```

---

## Files to Create

### Pages

| Path | Description |
|------|-------------|
| `src/app/requests/page.tsx` | Requests listing with filters |
| `src/app/requests/new/page.tsx` | Create new request form |
| `src/app/requests/[id]/page.tsx` | Request detail page |

### Components

| Path | Description |
|------|-------------|
| `src/components/requests/RequestCard.tsx` | Card for request listings |
| `src/components/requests/RequestForm.tsx` | Create request form |
| `src/components/requests/BountyBadge.tsx` | Shows bounty amount in USDC |
| `src/components/requests/RequestFilters.tsx` | Filter by status, type, bounty |
| `src/components/requests/ClaimButton.tsx` | Claim request button |
| `src/components/requests/StatusBadge.tsx` | Status indicator |

### Hooks

| Path | Description |
|------|-------------|
| `src/hooks/useRequests.ts` | Fetch and manage requests |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/types/database.ts` | Add bounty fields to ContentRequest type |
| `src/components/layout/Header.tsx` | Add Requests nav link |

---

## User Flows

### Creating a Request
1. Navigate to /requests → Click "New Request"
2. Fill form: title, description, type, tags
3. Enter bounty amount (USDC) - display only, payment handled externally
4. Optionally set deadline
5. Request created with 'open' status

### Claiming a Request
1. Browse /requests → Filter by bounty, type, status
2. View request detail → Click "Claim"
3. Claim recorded with 7-day expiration
4. Status → 'in_progress'

### Fulfilling a Request
1. Creator submits content via regular submission tool
2. Links submission to request
3. Requester marks as fulfilled
4. Payment handled externally (USDC)

---

## Page Designs

### Requests List (`/requests`)
- Filter bar: Status (Open, In Progress, Fulfilled), Type, Bounty range
- Sort: Newest, Highest Bounty, Deadline
- Grid of RequestCards
- "Create Request" CTA

### Request Detail (`/requests/[id]`)
- Full description
- Bounty amount prominently displayed
- Deadline countdown (if set)
- Claim button (if open)
- Submissions list (if any)
- Mark as fulfilled button (for requester)

### New Request (`/requests/new`)
- Title (required)
- Description (required)
- Content type (optional)
- Tags (optional)
- Bounty amount in USDC (required, minimum $0)
- Deadline (optional)

---

## Implementation Phases

### Phase 1: Database
1. Create migration
2. Apply via Supabase
3. Update TypeScript types

### Phase 2: Components
1. RequestCard, BountyBadge, StatusBadge
2. RequestFilters, RequestForm
3. ClaimButton

### Phase 3: Pages
1. /requests listing
2. /requests/new
3. /requests/[id] detail

### Phase 4: Integration
1. Link submissions to requests
2. Header navigation
3. Mobile responsive

---

## Verification Steps

1. Create request with bounty works
2. Claim request updates status
3. Filters work correctly
4. Users cannot claim own requests
5. Deadline displays correctly
6. Mobile responsive

---

## Future Enhancement
- **Pepperoni Integration** - On-chain token system for bounties (see separate task)
