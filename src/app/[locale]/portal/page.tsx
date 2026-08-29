import { redirect } from 'next/navigation';

export default async function PortalIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/portal/dashboard`);
}
