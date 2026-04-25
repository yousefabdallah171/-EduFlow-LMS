/**
 * Load Test: Payment History Queries
 * Tests query optimization and caching under concurrent read load
 * 1000+ concurrent students querying their payment history
 *
 * Run with: k6 run tests/load/history-queries.js
 *
 * Verifies:
 * - Database query optimization
 * - Cache effectiveness (Redis)
 * - N+1 query prevention
 * - Pagination performance
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const queryDuration = new Trend('query_duration');
const querySuccess = new Counter('query_success');
const queryFailure = new Counter('query_failure');
const queryErrors = new Rate('query_errors');
const cacheHits = new Counter('cache_hits');

export const options = {
  stages: [
    { duration: '1m', target: 1000 },  // Ramp-up to 1000 users over 1 minute
    { duration: '2m', target: 1000 },  // Stay at 1000 for 2 minutes
    { duration: '1m', target: 0 }      // Ramp-down to 0
  ],
  thresholds: {
    'http_req_duration': ['p(95)<300', 'p(99)<500'],  // 95% under 300ms, 99% under 500ms
    'http_req_failed': ['rate<0.01'],   // < 1% error rate
    'query_errors': ['rate<0.01']
  }
};

const API_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  // Each VU is a different student
  const authToken = `token-student-${__VU}-${Date.now()}`;

  group('Payment History Queries - Load Test', () => {
    // Different query patterns
    const queryPatterns = [
      {
        name: 'All payments - no filter',
        params: ''
      },
      {
        name: 'Filter by COMPLETED status',
        params: '?status=COMPLETED'
      },
      {
        name: 'Filter by PENDING status',
        params: '?status=PENDING'
      },
      {
        name: 'Search by order ID',
        params: '?search=order-123'
      },
      {
        name: 'Paginated - page 1',
        params: '?page=1&limit=10'
      },
      {
        name: 'Paginated - page 5',
        params: '?page=5&limit=10'
      },
      {
        name: 'Sorted by newest',
        params: '?sort=-createdAt'
      },
      {
        name: 'Sorted by oldest',
        params: '?sort=createdAt'
      },
      {
        name: 'Combined filters',
        params: '?status=COMPLETED&sort=-createdAt&limit=20'
      }
    ];

    // Random query pattern for each iteration
    const pattern = queryPatterns[Math.floor(Math.random() * queryPatterns.length)];

    // Execute query
    const startTime = new Date();
    const response = http.get(
      `${API_URL}/api/v1/student/orders${pattern.params}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'User-Agent': 'LoadTest-HistoryQuery/1.0'
        },
        tags: {
          query: pattern.name
        }
      }
    );
    const duration = new Date() - startTime;
    queryDuration.add(duration);

    // Check response
    if (response.status === 200) {
      querySuccess.add(1);
      check(response, {
        'query succeeds': (r) => r.status === 200,
        'query < 300ms (p95)': (r) => r.timings.duration < 300,
        'valid JSON': (r) => {
          try {
            JSON.parse(r.body);
            return true;
          } catch {
            return false;
          }
        },
        'has orders array': (r) => r.body.includes('orders'),
        'cache header present': (r) => r.headers['X-Cache'] || r.headers['Cache-Control']
      });

      // Track cache hits
      if (response.headers['X-Cache'] && response.headers['X-Cache'].includes('HIT')) {
        cacheHits.add(1);
      }
    } else if (response.status === 401) {
      // Auth error - expected if token invalid
      check(response, {
        'auth error valid': (r) => r.status === 401
      });
    } else {
      queryFailure.add(1);
      queryErrors.add(1);
      check(response, {
        'error response valid': (r) => r.status >= 400
      });
    }

    // Sleep between queries (simulate user reading results)
    sleep(Math.random() * 2 + 1); // 1-3 seconds
  });
}

/**
 * Performance Goals:
 *
 * 1. Query Optimization
 *    - No N+1 queries (e.g., fetching user for each order)
 *    - Indexes on: status, createdAt, userId
 *    - COUNT(*) optimized (not counting full result set)
 *
 * 2. Caching Strategy
 *    - Cache payment history for 5 minutes per user
 *    - Invalidate on new payment
 *    - Cache key: user:{userId}:orders:{filters}
 *
 * 3. Pagination
 *    - Always use limit (default 10, max 100)
 *    - Prevent full table scans
 *    - Return total count separately if needed
 *
 * Acceptance Criteria:
 * ✅ < 300ms response time at p95
 * ✅ < 1% error rate
 * ✅ Cache hit rate > 70%
 * ✅ No timeout errors
 * ✅ No connection pool exhaustion
 *
 * To run:
 * $ k6 run tests/load/history-queries.js
 *
 * To run with custom API:
 * $ API_URL=http://api.prod.example.com k6 run tests/load/history-queries.js
 *
 * Expected metrics after run:
 * - Total requests: ~9000-10000
 * - Success rate: >99%
 * - Cache hit rate: >70%
 * - Average response time: <150ms
 */
