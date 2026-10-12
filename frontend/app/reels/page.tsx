import Link from "next/link";
import ReelsExperience from "../../components/ReelsExperience";
import { fetchPublishedReels } from "../../lib/content";

export const revalidate = 30;

export default async function ReelsPage() {
  const reels = await fetchPublishedReels();

  if (!reels.length) {
    return (
      <main className="flex min-h-[80vh] flex-col items-center justify-center bg-[#faf7f2] px-4 py-16 text-center">
        <h1 className="font-serif text-3xl text-stone-900">Reels are unavailable</h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-600">
          There are no active reels linked to available products right now.
        </p>
        <Link
          href="/products"
          className="mt-6 rounded-xl bg-[#881337] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#701a35]"
        >
          Browse Products
        </Link>
      </main>
    );
  }

  return <ReelsExperience reels={reels} />;
}
