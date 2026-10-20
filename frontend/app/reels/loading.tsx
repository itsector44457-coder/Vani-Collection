export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0807]">
      <p role="status" className="sr-only">Loading reels…</p>
      <div aria-hidden="true" className="aspect-[9/16] w-56 animate-pulse rounded-3xl bg-white/10" />
    </div>
  );
}
