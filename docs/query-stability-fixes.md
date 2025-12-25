# Query Stability Fixes - Navigation Blocking Prevention

**Date**: Current  
**Status**: ✅ Complete

## Problem
Unstable Firestore queries (queries created inline in `useCollection` calls) were causing navigation blocking issues. When queries are recreated on every render, they trigger unnecessary re-subscriptions that prevent smooth navigation.

## Solution
All queries passed to `useCollection` hooks are now wrapped in `React.useMemo` to ensure stable references. This prevents query recreation on every render.

---

## ✅ Fixed Pages & Components

### 1. **Dashboard Page** (`src/app/dashboard/page.tsx`)
- ✅ AdminDashboard - `recentRequestsQuery` (already fixed)
- ✅ RequesterDashboard - `myRequestsQuery` (already using useMemo)
- ✅ QATesterDashboard - `pendingRequestsQuery` + `myApprovalsQuery` ✅ FIXED
- ✅ DeveloperDashboard - `myRequestsQuery` ✅ FIXED
- ✅ SeniorQADashboard - `pendingRequestsQuery` + `approvedRequestsQuery` ✅ FIXED

### 2. **New Request Page** (`src/app/dashboard/requests/new/page.tsx`)
- ✅ `teamsQuery`, `projectsQuery`, `qaUsersQuery` - All using useMemo

### 3. **My Work Page** (`src/app/dashboard/my-work/page.tsx`)
- ✅ `projectsQuery`, `teamsQuery`, `qaUsersQuery` - All using useMemo

### 4. **Request Details Page** (`src/app/dashboard/requests/[id]/page.tsx`)
- ✅ `commentsQuery` - Already using useMemo

### 5. **My Records Page** (`src/app/dashboard/my-records/page.tsx`)
- ✅ `infractionsQuery`, `bonusesQuery` - Already using useMemo

### 6. **Leave Page** (`src/app/dashboard/leave/page.tsx`)
- ✅ `leaveQuery` - Already using useMemo

### 7. **Admin Project Details** (`src/app/dashboard/admin/projects/[id]/page.tsx`)
- ✅ `requestsQuery` - Already using useMemo

---

## ✅ Already Stable (No Queries)

The following pages use simple `useCollection('collectionName')` calls without custom queries, so they don't need memoization:

- `src/app/dashboard/admin/users/page.tsx`
- `src/app/dashboard/admin/teams/page.tsx`
- `src/app/dashboard/admin/projects/page.tsx`
- `src/app/dashboard/admin/leave/page.tsx`
- `src/app/dashboard/admin/infractions/page.tsx`
- `src/app/dashboard/admin/bonuses/page.tsx`
- `src/app/dashboard/admin/payroll/page.tsx`
- `src/app/dashboard/admin/design-approvals/page.tsx`
- `src/app/dashboard/admin/diagnostics/page.tsx`
- `src/app/dashboard/admin/project-insights/page.tsx`
- `src/app/dashboard/teams/page.tsx`
- `src/app/dashboard/analytics/page.tsx`
- `src/app/dashboard/leaderboards/page.tsx`
- `src/app/dashboard/designs/[id]/page.tsx` (uses useDocument)
- `src/app/dashboard/certificates/[id]/page.tsx` (uses useDocument)

### Components
All form components use simple `useCollection('collectionName')` calls:
- `src/components/admin/team-form.tsx`
- `src/components/admin/user-form.tsx`
- `src/components/admin/task-form.tsx`
- `src/components/admin/project-form.tsx`
- `src/components/admin/infraction-form.tsx`
- `src/components/admin/bonus-form.tsx`
- `src/components/admin/team-details.tsx`

---

## Pattern Applied

### Before (Unstable):
```typescript
const { data: items } = useCollection<Item>(
  'items',
  query(collection(db!, 'items'), where('status', '==', 'active'))
);
```

### After (Stable):
```typescript
const itemsQuery = React.useMemo(() => {
  if (!db) return null;
  return query(collection(db, 'items'), where('status', '==', 'active'));
}, []); // Empty deps for static queries, or [dep1, dep2] for dynamic

const { data: items } = useCollection<Item>('items', itemsQuery);
```

---

## Key Principles

1. **Static Queries**: Use empty dependency array `[]`
2. **Dynamic Queries**: Include dependencies that affect the query (e.g., `[user?.id]`, `[project]`)
3. **Null Checks**: Always check if `db` exists before creating queries
4. **Return null**: Return `null` if prerequisites aren't met (user not loaded, db not initialized)

---

## Testing Checklist

- [x] QA Dashboard loads without blocking navigation
- [x] New Request page doesn't block navigation
- [x] My Work page doesn't block navigation
- [x] All dashboard variants load correctly
- [x] Navigation between pages is smooth
- [x] No console errors related to queries

---

## Status: ✅ ALL QUERIES ARE NOW STABLE

All pages and components have been audited and fixed. Navigation blocking issues should be resolved across the entire system.

