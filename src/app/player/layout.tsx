export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Player pages render their own <html> with vanilla JS
  // This layout is intentionally minimal to not wrap with React
  return <>{children}</>;
}
