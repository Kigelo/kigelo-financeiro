'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    apiFetch('/api/me').then(() => router.replace('/dashboard')).catch(() => router.replace('/login'));
  }, [router]);
  return <div style={{ padding: 24 }}>Carregando…</div>;
}
