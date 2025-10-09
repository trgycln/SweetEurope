import PageLayout from "@/components/PageLayout"; // Bu bileşen Header ve Footer'ı içeriyor olabilir

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Artık burada font tanımı yok.
  // Html ve body etiketleri de yok, çünkü onlar bir üst layout'tan geliyor.
  return (
    <PageLayout>{children}</PageLayout>
  );
}