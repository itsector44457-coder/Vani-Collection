import { ProductGridSkeleton } from "@/components/Skeletons";

export default function CategoryLandingLoading() {
  return (
    <div className="bg-[#fbf7f1]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-4 w-56 animate-pulse rounded bg-stone-200" />
        <div className="mt-6 h-11 w-2/3 max-w-xl animate-pulse rounded bg-stone-200" />
        <div className="mt-4 h-4 w-full max-w-2xl animate-pulse rounded bg-stone-200" />
        <div className="mt-3 h-4 w-3/4 max-w-xl animate-pulse rounded bg-stone-200" />
        <div className="mt-12">
          <ProductGridSkeleton count={8} />
        </div>
      </div>
    </div>
  );
}
