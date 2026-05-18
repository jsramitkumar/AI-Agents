---
description: "Use when writing UI components, designing UX flows, building REST or GraphQL APIs, architecting backend services, reviewing code structure, or working on full-stack features. Applies senior-level standards for both frontend and backend work."
applyTo: "**"
---

# Senior Software Engineer — UI/UX & Backend Standards

## Preferred Stack

- **Runtime**: Node.js
- **Framework**: Next.js (App Router)
- **Database**: PostgreSQL
- Default to this stack unless the user explicitly specifies otherwise

---

## General Engineering Principles

- Write self-documenting code; names should reveal intent without requiring comments
- Prefer composition over inheritance; favor small, single-responsibility units
- Apply SOLID principles across both frontend and backend layers
- Design for change: keep coupling loose and cohesion high
- Every function, component, or service should do one thing and do it well
- Avoid premature optimization — profile before fixing performance
- Delete dead code rather than commenting it out

---

## UI/UX — Frontend Standards

### Component Design

- Build components to be stateless where possible; lift state only when necessary
- Follow atomic design: atoms → molecules → organisms → templates → pages
- Keep components under ~200 lines; split when logic or markup grows complex
- Separate concerns: presentation components must not contain business logic
- Use controlled components for forms; avoid uncontrolled inputs except for file uploads
- Prefer composition via props/slots over component inheritance

### Accessibility (a11y)

- All interactive elements must be keyboard-navigable and focusable
- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`, `<article>`) before reaching for `<div>`
- Every image requires a descriptive `alt` attribute; decorative images use `alt=""`
- Color alone must never convey information — pair it with text or iconography
- Maintain WCAG 2.1 AA contrast ratios: 4.5:1 for normal text, 3:1 for large text
- Provide ARIA labels where semantic HTML is insufficient; do not duplicate visible text in ARIA

### UX Patterns

- Follow established patterns (navigation, forms, tables, modals) before inventing new ones
- Design loading states, empty states, and error states for every async operation
- Never leave the user without feedback — every action must have a visible response within 200ms
- Prefer progressive disclosure over exposing all options at once
- Use skeleton screens over spinners for content-heavy layouts
- Error messages must be actionable: say what went wrong and what the user can do next
- Validate forms inline (on blur) rather than only on submit

### Styling & Theming

- Use design tokens (CSS variables or theme values) for colors, spacing, and typography — never hard-code raw values
- Follow a consistent spacing scale (e.g., 4px base unit multiples)
- Mobile-first responsive design; breakpoints must be defined in tokens, not scattered inline
- Dark mode and high-contrast mode must be considered in all UI work
- Animations must respect `prefers-reduced-motion`

### Performance

- Lazy-load routes and large components
- Memoize expensive computations and stable callbacks where re-render cost is measurable
- Virtualize long lists (100+ items)
- Optimize images: use modern formats (WebP/AVIF), correct sizing, and lazy loading
- Target Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1

---

## Backend Standards

### API Design

- Follow RESTful conventions: use nouns for resources, HTTP verbs for actions
- Version all public APIs from day one (`/api/v1/`)
- Return consistent response envelopes: `{ data, error, meta }`
- Use appropriate HTTP status codes — never return 200 with an error body
- Paginate all list endpoints; default page size must not exceed 100 items
- Support filtering, sorting, and field selection on collection endpoints
- GraphQL: prefer specific resolvers over overfetching; enforce query depth limits

### Service Architecture

- Keep services stateless; externalize all state to databases, caches, or queues
- Use the repository pattern to decouple data access from business logic
- Domain logic belongs in the service/domain layer — never in controllers or resolvers
- Avoid direct service-to-service HTTP calls in the hot path; use events or queues for decoupled workflows
- Design services around bounded contexts; resist the urge to share databases across service boundaries

### Database & Data Access

- Write all schema changes as reversible, versioned migrations
- Use indexes on all foreign keys and frequently queried columns
- Never run raw user input in queries — always use parameterized queries or ORM bindings
- Avoid N+1 queries; use eager loading, `JOIN`, or batching (e.g., DataLoader)
- Use database transactions for multi-step writes; rollback on any failure
- Do not store secrets, PII, or tokens in plaintext — hash or encrypt appropriately

### Security (OWASP Top 10)

- Validate and sanitize all input at the API boundary — never trust client data
- Enforce authentication on all non-public endpoints; use JWT or session tokens, not API keys in query params
- Apply least-privilege: each service/role gets only the permissions it needs
- Implement rate limiting and request size limits on all public endpoints
- Use parameterized queries exclusively — no string interpolation in SQL
- Set security headers: `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`
- Log authentication events, authorization failures, and sensitive operations (never log passwords or tokens)

### Error Handling & Resilience

- Distinguish between operational errors (expected, handle gracefully) and programmer errors (crash fast)
- Use structured error types with codes, messages, and HTTP status mappings
- Wrap external calls (HTTP, DB, cache) with timeouts and circuit breakers
- Implement retry logic with exponential backoff and jitter for transient failures
- All background jobs must be idempotent — safe to re-run on failure

### Observability

- Emit structured logs (JSON) with request ID, user ID, service name, and severity
- Expose a `/health` endpoint and a `/metrics` endpoint (Prometheus-compatible)
- Trace cross-service requests with distributed tracing (OpenTelemetry or equivalent)
- Alert on error rate spikes, latency p99 degradation, and queue depth growth

---

## Testing Standards

### Coverage Targets

| Layer | Minimum Coverage | Approach |
|---|---|---|
| Business logic / domain services | 90%+ | Unit tests |
| API endpoints | 80%+ | Integration tests |
| UI components (stateful) | 70%+ | Component tests |
| Critical user flows | 100% | End-to-end tests |

### Test Quality Rules

- One assertion concept per test; keep tests focused and readable
- Tests must be deterministic — no random data, no time-dependent assertions without mocking
- Mock only external dependencies (network, DB, time); test real domain logic
- Name tests: `should <expected behavior> when <condition>`
- Integration tests must run against a real (containerized) database, not mocks
- E2E tests cover the full happy path and the most critical error paths only

---

## Code Review Checklist

Before opening a PR or considering a feature complete:

- [ ] No secrets, credentials, or PII in code or logs
- [ ] Input validation present at all API/form entry points
- [ ] Error states and loading states handled in UI
- [ ] New API endpoints are authenticated and authorized
- [ ] Database queries use parameterized inputs
- [ ] Migrations are reversible
- [ ] Tests added for new logic; existing tests pass
- [ ] Accessibility requirements met for UI changes
- [ ] No console.log / debug statements left in code
- [ ] Performance impact considered (queries, re-renders, bundle size)
