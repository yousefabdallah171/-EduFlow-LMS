import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

const THRESHOLD_PROFILE = (__ENV.THRESHOLD_PROFILE || "local").toLowerCase();
const VIDEO_ITERATION_SEGMENTS = Number(__ENV.VIDEO_ITERATION_SEGMENTS || 2);

const STUDENT_USERS_JSON = __ENV.STUDENT_USERS_JSON || "";
const STUDENT_USERS = (() => {
  if (!STUDENT_USERS_JSON.trim()) return [];
  try {
    const parsed = JSON.parse(STUDENT_USERS_JSON);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
})();

const thresholds =
  THRESHOLD_PROFILE === "prod_like"
    ? {
        http_req_failed: ["rate<0.001"],
        http_req_duration: ["p(95)<500", "p(99)<900"]
      }
    : {
        http_req_failed: ["rate<0.01"],
        http_req_duration: ["p(95)<800", "p(99)<1200"]
      };

export const options = {
  thresholds,
  scenarios: {
    public_course: {
      executor: "ramping-vus",
      exec: "publicCourse",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 5 },
        { duration: "20s", target: 15 },
        { duration: "10s", target: 0 }
      ]
    },
    student_browse: {
      executor: "ramping-vus",
      exec: "studentBrowse",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 1 },
        { duration: "20s", target: 3 },
        { duration: "10s", target: 0 }
      ]
    },
    video_path_low_rate: {
      executor: "constant-vus",
      exec: "videoPath",
      vus: 1,
      duration: "20s"
    }
  }
};

const jsonHeaders = { "content-type": "application/json" };

const pickStudentUserForVu = () => {
  if (STUDENT_USERS.length === 0) return null;
  const idx = (__VU - 1) % STUDENT_USERS.length;
  const u = STUDENT_USERS[idx];
  if (!u?.email || !u?.password) return null;
  return u;
};

const loginOncePerVu = (() => {
  let cached = null;

  return () => {
    if (cached) return cached;

    const u = pickStudentUserForVu();
    if (!u) {
      throw new Error(
        "Missing student credentials. Set STUDENT_USERS_JSON='[{\"email\":\"...\",\"password\":\"...\"}]' for authenticated scenarios."
      );
    }

    const jar = http.cookieJar();
    const resp = http.post(
      `${BASE_URL}/api/v1/auth/login`,
      JSON.stringify({ email: u.email, password: u.password }),
      {
        headers: jsonHeaders,
        jar,
        redirects: 0
      }
    );

    check(resp, {
      "login 200": (r) => r.status === 200
    });

    const body = resp.json();
    const accessToken = body?.accessToken;
    if (!accessToken) throw new Error("Login succeeded but accessToken missing.");

    cached = { jar, accessToken };
    return cached;
  };
})();

export function publicCourse() {
  const res = http.get(`${BASE_URL}/api/v1/course`, { redirects: 0 });
  check(res, { "course 200": (r) => r.status === 200 });
  sleep(0.2);
}

export function studentBrowse() {
  const { jar, accessToken } = loginOncePerVu();
  const authHeaders = { authorization: `Bearer ${accessToken}` };

  const dash = http.get(`${BASE_URL}/api/v1/student/dashboard`, { headers: authHeaders, jar, redirects: 0 });
  check(dash, { "dashboard 200": (r) => r.status === 200 });

  const grouped = http.get(`${BASE_URL}/api/v1/lessons/grouped`, { headers: authHeaders, jar, redirects: 0 });
  check(grouped, { "lessons/grouped 200": (r) => r.status === 200 });

  const list = http.get(`${BASE_URL}/api/v1/lessons`, { headers: authHeaders, jar, redirects: 0 });
  check(list, { "lessons 200": (r) => r.status === 200 });

  sleep(0.2);
}

const extractFirstMatch = (text, re) => {
  const m = text.match(re);
  return m?.[1] ?? null;
};

export function videoPath() {
  const { jar, accessToken } = loginOncePerVu();
  const authHeaders = { authorization: `Bearer ${accessToken}` };

  const lessons = http.get(`${BASE_URL}/api/v1/lessons`, { headers: authHeaders, jar, redirects: 0 });
  check(lessons, { "lessons 200 (video)": (r) => r.status === 200 });
  const lessonsBody = lessons.json();
  const firstLessonId = lessonsBody?.lessons?.find?.((l) => !!l?.id)?.id || lessonsBody?.lessons?.[0]?.id || null;
  if (!firstLessonId) return;

  const detail = http.get(`${BASE_URL}/api/v1/lessons/${firstLessonId}`, { headers: authHeaders, jar, redirects: 0 });
  check(detail, { "lesson detail 200": (r) => r.status === 200 || r.status === 403 });
  if (detail.status !== 200) return;

  const hlsUrl = detail.json()?.hlsUrl;
  if (!hlsUrl) return;

  const playlist = http.get(`${BASE_URL}${hlsUrl}`, { jar, redirects: 0 });
  check(playlist, { "playlist 200": (r) => r.status === 200 });
  if (playlist.status !== 200) return;

  const playlistText = playlist.body || "";
  const keyPath = extractFirstMatch(playlistText, /URI=\"(\/api\/v1\/video\/[^\\\"]+\/key\?token=[^\"]+)\"/);
  if (keyPath) {
    const keyRes = http.get(`${BASE_URL}${keyPath}`, { jar, redirects: 0 });
    check(keyRes, { "key 200": (r) => r.status === 200 });
  }

  const segmentUrls = [];
  for (const line of playlistText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (!trimmed.includes("/api/v1/video/")) continue;
    segmentUrls.push(trimmed.startsWith("http") ? trimmed : `${BASE_URL}${trimmed}`);
    if (segmentUrls.length >= Math.max(1, VIDEO_ITERATION_SEGMENTS)) break;
  }

  for (const url of segmentUrls) {
    const seg = http.get(url, { jar, redirects: 0 });
    check(seg, { "segment 200/206": (r) => r.status === 200 || r.status === 206 });
  }

  sleep(0.5);
}

