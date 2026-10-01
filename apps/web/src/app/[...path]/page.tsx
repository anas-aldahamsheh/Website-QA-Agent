import { notFound } from 'next/navigation';
import DashboardPage from '../page';
import type { DashboardSearchParams } from '@/server/queries/dashboard';

export const dynamic = 'force-dynamic';

type PathPageProps = {
  params: Promise<{
    path: string[];
  }>;
  searchParams?: Promise<DashboardSearchParams>;
};

export default async function PathPage({ params, searchParams }: PathPageProps) {
  const { path } = await params;
  const normalizedPath = path.map((segment) => decodeURIComponent(segment)).join('/');
  if (normalizedPath !== 'Run Center') {
    notFound();
  }

  return DashboardPage({ searchParams });
}
