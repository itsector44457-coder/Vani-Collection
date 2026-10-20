"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Badge, Card, EmptyState, IconBox, IconHeart, IconPin, PageHeader } from "@/lib/account-ui";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { isApiConfigured } from "@/lib/api-client";
import { orderStatusLabel, type StoreOrder } from "@/lib/storefront-types";
import { useCatalogue, useMyOrders } from "@/lib/use-storefront";
import { formatPrice, productHref } from "@/lib/utils";
import { clearRecentlyViewed, getRecentlyViewedServerSnapshot, readRecentlyViewed, subscribeRecentlyViewed } from "@/lib/recently-viewed";

const ACTIVE_STATUSES = ["pending_payment", "confirmed", "processing", "packed", "shipped"];
const FLOW = ["pending_payment", "confirmed", "processing", "packed", "shipped", "delivered"];

const dateLabel = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const tone = (status: string) => status === "delivered" ? "success" : ACTIVE_STATUSES.includes(status) ? "info" : ["cancelled", "returned", "refunded"].includes(status) ? "danger" : "warning";

function OrderProgress({ order }: { order: StoreOrder }) {
  const reached = Math.max(0, FLOW.indexOf(order.status));
  const steps = [
    { label: "Order mila", done: reached >= 1 },
    { label: "Packing", done: reached >= 3 },
    { label: "Dispatch", done: reached >= 4 },
    { label: "Delivered", done: reached >= 5 },
  ];
  return (
    <ol className="mt-4 grid grid-cols-4 gap-2" aria-label={`Order sthiti: ${orderStatusLabel(order.status)}`}>
      {steps.map((step) => (
        <li key={step.label} className="text-center">
          <span className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold ${step.done ? "bg-[#881337] text-white" : "bg-stone-100 text-stone-400"}`}>{step.done ? "✓" : "•"}</span>
          <span className={`mt-1.5 block text-[11px] font-medium ${step.done ? "text-[#881337]" : "text-stone-400"}`}>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

export default function AccountDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { wishlist } = useCart();
  const live = isApiConfigured();
  const ordersResource = useMyOrders(isAuthenticated);
  const catalogueResource = useCatalogue({ limit: 100 });
  const recentlyViewedRefs = useSyncExternalStore(subscribeRecentlyViewed, readRecentlyViewed, getRecentlyViewedServerSnapshot);

  if (!isAuthenticated) {
    return (
      <Card title="Sign in kare" description="Account ke orders, wishlist aur addresses dekhne ke liye sign in zaroori hai.">
        <p className="text-[13px] leading-relaxed text-stone-600">
          Guest checkout wala order account me nahi dikhega — use bina login <Link href="/track-order" className="font-semibold text-[#881337] underline underline-offset-2">Track Order</Link> par order number + mobile se dekhe.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/login?redirect=/account" className="inline-flex min-h-11 items-center rounded-full bg-[#881337] px-5 text-[12.5px] font-semibold text-white hover:bg-[#6b0f2b]">Sign in</Link>
          <Link href="/signup" className="inline-flex min-h-11 items-center rounded-full border border-stone-300 bg-white px-5 text-[12.5px] font-semibold text-stone-700 hover:border-[#881337] hover:text-[#881337]">Create account</Link>
        </div>
      </Card>
    );
  }

  const orders = ordersResource.data;
  const activeOrders = orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
  const latestActive = activeOrders[0] ?? null;
  const deliveredCount = orders.filter((order) => order.status === "delivered").length;
  const wishlistProducts = catalogueResource.data.filter((product) => wishlist.includes(product.productId ?? product.id) || wishlist.includes(product.id)).slice(0, 3);
  const recentlyViewedProducts = recentlyViewedRefs
    .map((ref) => catalogueResource.data.find((product) => product.slug === ref.slug || product.id === ref.id || product.productId === ref.id))
    .filter((product): product is NonNullable<typeof product> => Boolean(product))
    .slice(0, 4);
  const defaultAddress = user?.addresses?.find((address) => address.isDefault) ?? user?.addresses?.[0] ?? null;
  const missing: { label: string; href: string }[] = [];
  if (!user?.phone) missing.push({ label: "Mobile number jode (delivery updates ke liye)", href: "/account/profile" });
  if (!defaultAddress) missing.push({ label: "Delivery address save kare (checkout tez hoga)", href: "/account/addresses" });
  if (!user?.preferences?.preferredSize) missing.push({ label: "Apni pasandeeda size save kare", href: "/account/profile" });

  return (
    <>
      <PageHeader
        eyebrow="My Account"
        title={`Namaste, ${user?.firstName || "Guest"} ji`}
        subtitle={user?.email}
        action={<Link href="/products" className="inline-flex min-h-11 items-center rounded-full bg-[#881337] px-5 text-[12.5px] font-semibold text-white hover:bg-[#6b0f2b]">Shopping jaari rakhe</Link>}
      />

      {missing.length > 0 && (
        <Card title="Account poora kare" description="Yeh choti jaankari checkout aur delivery dono aasan banayegi." className="mb-5">
          <ul className="space-y-2">
            {missing.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-[#881337]/5 px-4 py-2.5 text-[13px] font-semibold text-[#881337] transition hover:bg-[#881337]/10">
                  <span>{item.label}</span><span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <dl className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Account summary">
        {[
          { label: "Kul orders", value: orders.length, href: "/account/orders" },
          { label: "Chal rahe orders", value: activeOrders.length, href: "/account/orders" },
          { label: "Delivered", value: deliveredCount, href: "/account/orders" },
          { label: "Wishlist", value: wishlist.length, href: "/account/wishlist" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-2xl border border-[#ebe6de] bg-white p-4 transition hover:border-[#881337]/30">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">{stat.label}</dt>
            <dd className="mt-1 font-serif text-[26px] font-semibold text-stone-900">{isLoading || ordersResource.loading ? "…" : stat.value}</dd>
          </Link>
        ))}
      </dl>

      {ordersResource.error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">{ordersResource.error}</p>}

      {latestActive ? (
        <Card title="Aapka chal raha order" description={`#${latestActive.orderNumber} · ${dateLabel(latestActive.createdAt)} · ${formatPrice(latestActive.amounts.total)}`} className="mb-5" action={<Badge tone={tone(latestActive.status) as never} dot>{orderStatusLabel(latestActive.status)}</Badge>}>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {latestActive.items.map((item) => (
              <div key={item.sku} className="flex min-w-56 items-center gap-3 rounded-xl bg-stone-50 p-3 ring-1 ring-stone-100">
                <span className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-stone-200">{item.image && <Image src={item.image} alt="" fill unoptimized sizes="48px" className="object-cover object-top" />}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-semibold text-stone-900">{item.name ?? item.sku}</span>
                  <span className="mt-0.5 block text-[11px] text-stone-500">{[item.size && `Size ${item.size}`, `Qty ${item.quantity}`].filter(Boolean).join(" · ")}</span>
                </span>
              </div>
            ))}
          </div>
          <OrderProgress order={latestActive} />
          {latestActive.shipment?.estimatedDelivery && <p className="mt-3 text-center text-[12px] text-stone-500">Anumanit delivery: <strong className="text-stone-800">{dateLabel(latestActive.shipment.estimatedDelivery)}</strong></p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/account/track?order=${encodeURIComponent(latestActive.orderNumber)}`} className="inline-flex min-h-11 items-center rounded-full bg-[#881337] px-5 text-[12.5px] font-semibold text-white hover:bg-[#6b0f2b]">Parcel track kare</Link>
            <Link href={`/account/orders/${latestActive._id}`} className="inline-flex min-h-11 items-center rounded-full border border-stone-300 bg-white px-5 text-[12.5px] font-semibold text-stone-700 hover:border-[#881337] hover:text-[#881337]">Order detail</Link>
          </div>
        </Card>
      ) : !ordersResource.loading && (
        <div className="mb-5">
          <EmptyState icon={<IconBox />} title="Koi chal raha order nahi hai" description="Guest checkout wala order yahan nahi dikhta — use guest tracking se dekhe." action={<span className="flex flex-wrap justify-center gap-2"><Link href="/products" className="inline-flex min-h-11 items-center rounded-full bg-[#881337] px-5 text-[12.5px] font-semibold text-white">Collection dekhe</Link><Link href="/track-order" className="inline-flex min-h-11 items-center rounded-full border border-stone-300 bg-white px-5 text-[12.5px] font-semibold text-stone-700">Guest order track kare</Link></span>} />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Haal ke orders" action={<Link href="/account/orders" className="text-[12px] font-semibold text-[#881337] hover:underline">Saare dekhe →</Link>}>
          {orders.length ? (
            <ul className="divide-y divide-[#f0ebe3]">
              {orders.slice(0, 4).map((order) => (
                <li key={order._id}>
                  <Link href={`/account/orders/${order._id}`} className="flex min-h-14 items-center justify-between gap-3 py-3 transition hover:text-[#881337]">
                    <span>
                      <span className="block text-[13px] font-semibold text-stone-900">#{order.orderNumber}</span>
                      <span className="mt-0.5 block text-[11.5px] text-stone-500">{dateLabel(order.createdAt)} · {order.items.reduce((sum, item) => sum + item.quantity, 0)} items</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <Badge tone={tone(order.status) as never}>{orderStatusLabel(order.status)}</Badge>
                      <strong className="text-[13px] text-stone-900">{formatPrice(order.amounts.total)}</strong>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="text-[13px] leading-relaxed text-stone-500">Abhi tak koi account order nahi hai.</p>}
        </Card>

        <Card title="Wishlist jhalak" action={<Link href="/account/wishlist" className="text-[12px] font-semibold text-[#881337] hover:underline">Wishlist khole →</Link>}>
          {wishlistProducts.length ? (
            <ul className="space-y-3">
              {wishlistProducts.map((product) => (
                <li key={product.id}>
                  <Link href={productHref(product)} className="flex min-h-14 items-center gap-3 rounded-xl p-1 transition hover:bg-stone-50">
                    <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-stone-100">{product.image && <Image src={product.image} alt="" fill unoptimized sizes="40px" className="object-cover object-top" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-stone-900">{product.title}</span>
                      <span className="mt-0.5 block text-[12px] font-bold text-[#881337]">{formatPrice(product.price)}</span>
                    </span>
                    <span aria-hidden="true" className="text-stone-400">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-start gap-3 text-[13px] leading-relaxed text-stone-500">
              <span className="mt-0.5 text-[#881337]"><IconHeart /></span>
              <p>Koi saved piece nahi hai. Pasand aane par ♡ dabaye — baad me yahi se size chune bag me daal sakti hain.</p>
            </div>
          )}
        </Card>

        <Card title="Default delivery address" action={<Link href="/account/addresses" className="text-[12px] font-semibold text-[#881337] hover:underline">Manage →</Link>}>
          {defaultAddress ? (
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-[#881337]"><IconPin /></span>
              <div className="text-[13px] leading-relaxed text-stone-600">
                <p className="font-semibold text-stone-900">{defaultAddress.fullName}</p>
                <p>{defaultAddress.address}, {defaultAddress.city}, {defaultAddress.state} – {defaultAddress.pincode}</p>
                <p>{defaultAddress.phone}</p>
              </div>
            </div>
          ) : <p className="text-[13px] leading-relaxed text-stone-500">Address save karne se checkout me baar-baar bharna nahi padega.</p>}
        </Card>

        <Card title="Madad aur jaankari">
          <ul className="grid gap-2 text-[13px] font-semibold">
            {[
              { label: "Order track kare (bina login bhi)", href: "/track-order" },
              { label: "Shipping aur delivery jaankari", href: "/shipping" },
              { label: "Returns aur size exchange", href: "/returns" },
              { label: "Size guide", href: "/size-guide" },
              { label: "Hamse sampark kare", href: "/contact" },
            ].map((item) => (
              <li key={item.href}><Link href={item.href} className="flex min-h-11 items-center justify-between rounded-xl bg-stone-50 px-4 text-stone-700 ring-1 ring-stone-100 transition hover:text-[#881337]"><span>{item.label}</span><span aria-hidden="true">→</span></Link></li>
            ))}
          </ul>
          {!live && <p className="mt-4 text-[11.5px] text-amber-700">Live account data abhi uplabdh nahi hai.</p>}
        </Card>
      </div>

      {recentlyViewedProducts.length > 0 && (
        <Card
          title="Haal me dekhe gaye pieces"
          description="Isi device par aapke dwara dekhe gaye haal ke products."
          className="mt-5"
          action={<button type="button" onClick={clearRecentlyViewed} className="min-h-10 text-[12px] font-semibold text-[#881337] hover:underline">History saaf kare</button>}
        >
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {recentlyViewedProducts.map((product) => (
              <li key={product.id}>
                <Link href={productHref(product)} className="group flex h-full items-center gap-3 rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-100 transition hover:ring-[#881337]/25">
                  <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                    {product.image && <Image src={product.image} alt="" fill unoptimized sizes="48px" className="object-cover object-top" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-semibold text-stone-900 group-hover:text-[#881337]">{product.title}</span>
                    <span className="mt-1 block text-[12px] font-bold text-[#881337]">{formatPrice(product.price)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
