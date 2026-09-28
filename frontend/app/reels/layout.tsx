export default function ReelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Full-screen reels experience — no navbar, no main wrapper
  return <div className="min-h-screen">{children}</div>;
}
