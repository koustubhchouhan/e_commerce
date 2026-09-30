// Shimmering placeholders shown while a page's data loads. They mirror the shape
// of the content that is about to appear, so the layout does not jump when it
// arrives — which reads as faster than a spinner or a bare "Loading…" line.
//
// Every variant is presentational (aria-hidden) with a single visually-hidden
// "Loading…" announcement per group, so screen readers hear the state once
// instead of every placeholder block.

function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

// Visually-hidden text for the group's single live-region announcement.
function LoadingAnnouncement() {
  return <span className="sr-only">Loading…</span>;
}

export function ProductCardSkeleton() {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[#E7DAC8] bg-[#FFFCF7]">
      <div className="aspect-[4/3] skeleton rounded-none" />
      <div className="p-4 flex flex-col gap-3">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-6 w-24 mt-1" />
        <Skeleton className="h-9 w-full mt-2 rounded-full" />
      </div>
    </article>
  );
}

export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div
      role="status"
      className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
    >
      <LoadingAnnouncement />
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategoryCardSkeleton() {
  return <Skeleton className="h-[300px] w-full rounded-2xl" />;
}

export function CategoryGridSkeleton({ count = 6 }) {
  return (
    <div role="status" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <LoadingAnnouncement />
      {Array.from({ length: count }, (_, i) => (
        <CategoryCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#E7DAC8] bg-[#FFFCF7] p-6 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function ReviewGridSkeleton({ count = 3 }) {
  return (
    <div role="status" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <LoadingAnnouncement />
      {Array.from({ length: count }, (_, i) => (
        <ReviewCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function MessageCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#E7DAC8] bg-[#FFFCF7] p-6 md:p-8 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full shrink-0" />
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  );
}

export function MessageListSkeleton({ count = 3 }) {
  return (
    <div role="status" className="flex flex-col gap-6">
      <LoadingAnnouncement />
      {Array.from({ length: count }, (_, i) => (
        <MessageCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListRowSkeleton() {
  return (
    <div className="rounded-2xl border border-[#E7DAC8] bg-[#FBF3E7] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function ListRowsSkeleton({ count = 3 }) {
  return (
    <div role="status" className="flex flex-col gap-3">
      <LoadingAnnouncement />
      {Array.from({ length: count }, (_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  );
}

// Generic card rows for the admin/seller panels (tables, inboxes, request
// queues, ledger lines). Wide and neutral so it fits any of those containers.
export function PanelRowsSkeleton({ rows = 5 }) {
  return (
    <div role="status" className="flex flex-col gap-3">
      <LoadingAnnouncement />
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-2xl border border-[#E7DAC8] bg-[#FBF3E7] p-4"
        >
          <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-8 w-24 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

// Two-column product detail: gallery on the left, buy box on the right, then a
// row of thumbnail tiles.
export function ProductDetailSkeleton() {
  return (
    <div role="status" className="max-w-[1440px] mx-auto px-6 md:px-12 py-10">
      <LoadingAnnouncement />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="flex flex-col gap-4">
          <Skeleton className="w-full aspect-square rounded-2xl" />
          <div className="flex gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="w-20 h-20 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-4/5" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-40 mt-2" />
          <Skeleton className="h-3 w-full mt-2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-11 w-full mt-4 rounded-full" />
          <Skeleton className="h-11 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Order detail: header line, then a card with item rows and a totals block.
// Rendered inside the page's own max-width wrapper, so it adds no outer padding.
export function OrderDetailSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-6">
      <LoadingAnnouncement />
      <Skeleton className="h-8 w-56" />
      <div className="rounded-2xl border border-[#E7DAC8] bg-[#FFFCF7] p-6 md:p-8 flex flex-col gap-5">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-xl shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-5 w-32 self-end" />
      </div>
    </div>
  );
}
