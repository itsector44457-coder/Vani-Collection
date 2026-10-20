/**
 * Route loading skeletons.
 *
 * Server-rendered placeholders shaped like the page that is coming, so navigation shows the
 * page's structure immediately instead of a blank screen (and reserves the layout, avoiding
 * content jumping when the real catalogue arrives). Decorative blocks are aria-hidden; a single
 * polite status announces the wait to assistive technology.
 */

function Bar({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-[#e9dfd3] ${className}`} />;
}

function Status({ label }: { label: string }) {
  return (
    <p role="status" className="sr-only">
      {label}
    </p>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-[#efe6da] bg-white">
      <div className="aspect-[3/4] animate-pulse bg-[#efe6da]" />
      <div className="space-y-2.5 p-4">
        <Bar className="h-3.5 w-3/4" />
        <Bar className="h-3 w-1/2" />
        <Bar className="h-4 w-2/5" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

/** Catalogue listing: dark hero band, filter toolbar, then the grid. */
export function ListingSkeleton() {
  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <Status label="Loading the collection…" />
      <div aria-hidden="true" className="animate-pulse bg-gradient-to-br from-[#1c1917] via-[#3d2012] to-[#881337] px-4 py-16">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4">
          <div className="h-3 w-40 rounded bg-white/25" />
          <div className="h-10 w-72 max-w-full rounded bg-white/25" />
          <div className="h-3.5 w-56 max-w-full rounded bg-white/20" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div aria-hidden="true" className="mb-6 flex flex-col gap-3 sm:flex-row">
          <Bar className="h-11 flex-1 rounded-xl" />
          <Bar className="h-11 rounded-xl sm:w-48" />
        </div>
        <ProductGridSkeleton />
      </div>
    </div>
  );
}

/** Product detail: breadcrumbs, gallery left, buy panel right. */
export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <Status label="Loading this product…" />
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <Bar className="h-3.5 w-64 max-w-full" />
        <div className="grid grid-cols-1 gap-8 pb-12 pt-4 lg:grid-cols-2 lg:gap-16">
          <div aria-hidden="true" className="space-y-4">
            <div className="aspect-[3/4] animate-pulse rounded-2xl bg-[#efe6da]" />
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="aspect-[3/4] animate-pulse rounded-xl bg-[#efe6da]" />
              ))}
            </div>
          </div>
          <div aria-hidden="true" className="space-y-5">
            <Bar className="h-6 w-24 rounded-full" />
            <Bar className="h-9 w-4/5" />
            <Bar className="h-4 w-40" />
            <Bar className="h-8 w-44" />
            <div className="flex gap-2.5">
              {Array.from({ length: 5 }, (_, index) => (
                <Bar key={index} className="h-11 w-12 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Bar className="h-13 rounded-xl py-6" />
              <Bar className="h-13 rounded-xl py-6" />
            </div>
            <Bar className="h-28 rounded-2xl" />
            <div className="space-y-2.5 pt-2">
              <Bar className="h-3.5 w-full" />
              <Bar className="h-3.5 w-11/12" />
              <Bar className="h-3.5 w-3/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Generic content page: centred heading, copy lines, card row. */
export function PageSkeleton({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="bg-[#faf7f2]">
      <Status label={label} />
      <div aria-hidden="true" className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4">
          <Bar className="h-3 w-36 rounded-full" />
          <Bar className="h-10 w-96 max-w-full" />
          <Bar className="h-4 w-[32rem] max-w-full" />
        </div>
        <div className="mx-auto mt-12 max-w-3xl space-y-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Bar key={index} className={`h-3.5 ${index % 3 === 2 ? "w-2/3" : "w-full"}`} />
          ))}
        </div>
        <div className="mt-14">
          <ProductGridSkeleton count={4} />
        </div>
      </div>
    </div>
  );
}

/** Form-shaped placeholder for checkout and account screens. */
export function FormSkeleton({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="bg-[#faf7f2]">
      <Status label={label} />
      <div aria-hidden="true" className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="space-y-4">
          <Bar className="h-8 w-56" />
          {Array.from({ length: 4 }, (_, index) => (
            <Bar key={index} className="h-12 rounded-xl" />
          ))}
          <Bar className="h-12 w-48 rounded-xl" />
        </div>
        <Bar className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}
