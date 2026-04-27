# System Architecture Diagram: Professional Media Upload & Lesson Attachment

## High-Level Components

```mermaid
flowchart LR
    A[Admin UI - Upload Queue] --> B[Upload Orchestrator]
    B --> C[IndexedDB Queue State]
    B --> D[Upload API]
    D --> E[Upload Session Service]
    E --> F[(PostgreSQL)]
    E --> G[(Redis)]
    E --> H[(Object Storage)]
    E --> I[Chunk Checkpoint Service]
    I --> F
    I --> G
    E --> J[Processing Queue]
    J --> K[Media Worker]
    K --> H
    K --> L[Integrity/Probe Service]
    L --> F
    A --> M[Media Library UI]
    M --> N[Media Library API]
    N --> F
    M --> O[Lesson Attachment UI]
    O --> P[Lesson Attachment API]
    P --> F
```

## Upload Lifecycle

```mermaid
sequenceDiagram
    participant UI as Admin UI
    participant IDX as IndexedDB
    participant API as Upload API
    participant SVC as Upload Session Service
    participant STORE as Object Storage
    participant DB as DB/Redis
    participant WRK as Media Worker

    UI->>API: Create upload session (file metadata)
    API->>SVC: Create session + token
    SVC->>DB: Persist UploadSession
    DB-->>SVC: Session created
    SVC-->>UI: Session ID + upload URL
    UI->>IDX: Persist queue item + session

    loop per chunk
      UI->>API: Upload chunk N
      API->>STORE: Append/store chunk N
      API->>SVC: Ack chunk N
      SVC->>DB: Save checkpoint N
      SVC-->>UI: Ack N + next hint
      UI->>IDX: Update local checkpoint
    end

    UI->>API: Complete upload session
    API->>SVC: Mark PROCESSING
    SVC->>DB: enqueue processing job
    WRK->>STORE: Build media artifacts
    WRK->>DB: Save integrity + duration + status READY/FAILED
```

## Resilience Paths

- **Refresh/reopen**: UI restores queue from IndexedDB, fetches authoritative checkpoint from server, resumes from max acknowledged chunk.
- **Offline**: `navigator.onLine` and failed heartbeat move queue to `OFFLINE`; automatic resume on reconnect.
- **Server errors**: per-chunk retry with bounded backoff and jitter; fail item after max attempts while allowing other queue items to progress.
- **Checkpoint mismatch**: server checkpoint wins; client replays missing chunk(s) only.
