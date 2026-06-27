import { createMiddleware } from 'hono/factory';
import type { AppContext } from './env';

// ============================================================
// 密码哈希 (PBKDF2 + SHA-256)
// ============================================================

export function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const saltBytes = new Uint8Array(salt.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password, salt);
  return computed === hash;
}

// ============================================================
// JWT (HMAC-SHA256)
// ============================================================

function base64url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export async function createJWT(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) }));
  const data = `${encodedHeader}.${encodedPayload}`;
  const sig = await hmacSign(data, secret);
  return `${data}.${sig}`;
}

export async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expectedSig = await hmacSign(`${header}.${payload}`, secret);
  if (!timingSafeEqual(sig, expectedSig)) return null;
  try {
    const decoded = JSON.parse(base64urlDecode(payload));
    if (decoded.exp && Date.now() / 1000 > decoded.exp) return null;
    return decoded;
  } catch {
    return null;
  }
}

// ============================================================
// Auth Middleware
// ============================================================

export const authMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: '未登录' }, 401);
  }
  const token = authHeader.slice(7);
  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload || !payload.userId) {
    return c.json({ success: false, error: '登录已过期，请重新登录' }, 401);
  }
  c.set('userId', payload.userId as number);
  c.set('userRole', payload.role as string);
  c.set('userStatus', payload.status as string);
  await next();
});

// 要求已审核通过
export const requireApproved = createMiddleware<AppContext>(async (c, next) => {
  const status = c.get('userStatus');
  if (status !== 'approved') {
    return c.json({ success: false, error: '账号尚未审核通过，暂无法使用此功能' }, 403);
  }
  await next();
});

// 要求管理员
export const requireAdmin = createMiddleware<AppContext>(async (c, next) => {
  const role = c.get('userRole');
  if (role !== 'admin') {
    return c.json({ success: false, error: '需要管理员权限' }, 403);
  }
  await next();
});
