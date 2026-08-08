export const SESSION_COOKIE_NAME = "admin_token";
export const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7일 (ms)

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || "default-session-secret-change-me";
}

// Web Crypto API를 사용해 SHA-256 서명 생성 (Node.js 및 Edge Runtime 모두 호환)
async function generateSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data + secret);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// 1. 비밀번호가 .env 설정과 맞는지 확인
export function verifyPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  return password === adminPassword;
}

// 2. 만료 시간 정보를 담은 서명된 세션 토큰 발행
export async function signSession(expire: number): Promise<string> {
  const secret = getSessionSecret();
  const signature = await generateSignature(`${expire}`, secret);
  return `${expire}.${signature}`;
}

// 3. 서명 검증 및 만료 시간 확인
export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return false;

    const [expireStr, signature] = parts;
    const expire = parseInt(expireStr, 10);

    // 만료 시간 체크
    if (isNaN(expire) || expire < Date.now()) {
      return false;
    }

    const secret = getSessionSecret();
    const expectedSignature = await generateSignature(expireStr, secret);

    return signature === expectedSignature;
  } catch {
    return false;
  }
}

// 4. Next.js 서버 컴포넌트/API 라우트용 세션 쿠키 검증 도구
export async function verifySessionCookie(): Promise<boolean> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return false;
    return await verifySessionToken(token);
  } catch {
    return false;
  }
}
