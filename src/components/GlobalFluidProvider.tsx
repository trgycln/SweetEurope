"use client";

import dynamic from 'next/dynamic';

const ForegroundFluidOverlay = dynamic(
  () => import('./ForegroundFluidOverlay'),
  { ssr: false }
);

export default function GlobalFluidProvider() {
  return <ForegroundFluidOverlay />;
}
