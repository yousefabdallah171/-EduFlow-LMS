# Research: Professional Media Upload & Lesson Attachment

## 1) Adaptive Chunking Strategy

**Decision**: Start with 5MB default chunk size and dynamically adapt within 1MB–20MB range using rolling throughput and recent error rate.  
**Rationale**: Gives stable baseline while reacting to slow or unstable links without over-fragmenting fast links.  
**Alternatives considered**:
- Fixed chunk size only: simpler but poor behavior across mixed network conditions.
- Aggressive growth only: causes repeated failures on unstable links.

## 2) Retry + Backoff Policy

**Decision**: Per-chunk retry with bounded exponential backoff + jitter (`5s`, `10s`, `30s`, then fail), manual retry always available.  
**Rationale**: Prevents infinite loops and avoids synchronized retry storms across multiple files.  
**Alternatives considered**:
- Immediate retries: overloads network/server under outages.
- Unlimited retries: hides true failure and blocks queue progress.

## 3) Local Persistence Layer

**Decision**: Use IndexedDB for queue/session/checkpoint persistence; keep volatile metrics in memory.  
**Rationale**: IndexedDB handles high-cardinality queue state and survives refresh/reopen.  
**Alternatives considered**:
- LocalStorage: capacity and serialization limits for large queues.
- Session-only memory: loses recovery guarantees.

## 4) Checkpointing Model

**Decision**: Dual checkpoints (client and server). Resume uses server as source of truth, client as optimization.  
**Rationale**: Handles split-brain cases where client thinks chunk is uploaded but server never persisted it.  
**Alternatives considered**:
- Client-only checkpoints: vulnerable to server-side drift or cleanup.
- Server-only checkpoints with no local state: slower UX recovery and poorer offline behavior.

## 5) Integrity Validation

**Decision**: Validate with size check + chunk checksum verification + media probe (playability/duration extraction).  
**Rationale**: Detects corruption early and avoids attaching broken assets to lessons.  
**Alternatives considered**:
- Size-only validation: misses silent corruption.
- Full-file hash only at upload start: expensive and delayed failure visibility.

## 6) Queue Concurrency

**Decision**: Default concurrency `2`, configurable to `3` for strong links.  
**Rationale**: Improves completion throughput while preserving browser responsiveness and lower contention on weak internet.  
**Alternatives considered**:
- Concurrency `1`: robust but too slow for 100+ files.
- Concurrency `5+`: high contention and unstable UX in weak network conditions.

## 7) Bulk Lesson Attachment

**Decision**: Hybrid mapping flow:
1) Auto-propose matches by normalized filename/title,
2) Manual review for low-confidence or unmatched items,
3) Atomic apply with audit trail.
**Rationale**: Fast at scale while protecting against accidental wrong attachments.  
**Alternatives considered**:
- Full auto-apply without review: high risk of incorrect lesson mapping.
- Fully manual attach: too slow for 100+ videos.
