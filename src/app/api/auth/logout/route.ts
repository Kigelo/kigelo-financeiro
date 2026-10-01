import { NextResponse } from 'next/server';
import { destroySession, getSession } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST() {
  const user = await getSession();
  if (user) {
    await query('INSERT INTO audit_logs (user_id, action, details) VALUES ($1,$2,$3)', [user.id, 'Logout', user.email]);
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
