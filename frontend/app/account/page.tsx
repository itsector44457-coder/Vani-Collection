"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { PRODUCTS } from "../../data/products";
import { productHref } from "../../lib/utils";
import { isApiConfigured } from "../../lib/api-client";
import { orderStatusLabel, type StoreOrder } from "../../lib/storefront-types";
import { useMyOrders } from "../../lib/use-storefront";

/* ── Mock data ── */
const MOCK_ORDERS = [
  {
    id: "VC892341",
    date: "24 Sep 2026",
    status: "Delivered",
    statusColor: "emerald",
    total: 2499,
    items: [
      {
        title: "Gulab Bagh Handblock Pure Mul Cotton Anarkali Set",
        size: "M", qty: 1, price: 2499,
        image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=200&q=80",
        slug: "gulab-bagh-handblock-pure-mul-cotton-anarkali-set",
      },
    ],
  },
  {
    id: "VC774209",
    date: "10 Sep 2026",
    status: "Dispatched",
    statusColor: "blue",
    total: 5198,
    items: [
      {
        title: "Chandni Ivory Chanderi Silk Zari Sharara Set",
        size: "S", qty: 1, price: 3699,
        image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=200&q=80",
        slug: "chandni-ivory-chanderi-silk-zari-sharara-set",
      },
      {
        title: "Roohani Indigo Handblock Floral Co-ord Set",
        size: "M", qty: 1, price: 1899,
        image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=200&q=80",
        slug: "roohani-indigo-handblock-floral-co-ord-set",
      },
    ],
  },
  {
    id: "VC661088",
    date: "2 Aug 2026",
    status: "Delivered",
    statusColor: "emerald",
    total: 1799,
    items: [
      {
        title: "Bagh-e-Fiza Flared Tiered Mul Dress",
        size: "XS", qty: 1, price: 1799,
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
        slug: "bagh-e-fiza-flared-tiered-mul-dress",
      },
    ],
  },
];

const STATUS_COLORS: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
};

const statusColour = (status: string) =>
  status === "delivered"
    ? "emerald"
    : ["shipped", "packed", "processing"].includes(status)
      ? "blue"
      : ["cancelled", "returned", "refunded"].includes(status)
        ? "red"
        : "amber";

/** Adapt an API order to the card layout used on this dashboard. */
const toDashboardOrder = (order: StoreOrder) => ({
  id: order.orderNumber,
  href: `/account/orders/${order._id}`,
  date: new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
  status: orderStatusLabel(order.status),
  statusColor: statusColour(order.status),
  total: order.amounts.total,
  items: order.items.map((item) => ({
    title: item.name ?? item.sku,
    size: item.size ?? "Free Size",
    qty: item.quantity,
    price: item.lineTotal,
    image: item.image ?? "",
    slug: null as string | null,
  })),
});

type Tab = "orders" | "wishlist" | "profile" | "address";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "orders", label: "My Orders", icon: "📦" },
  { id: "wishlist", label: "Wishlist", icon: "♥" },
  { id: "profile", label: "Profile", icon: "👤" },
  { id: "address", label: "Addresses", icon: "📍" },
];

/* ── Profile form ── */
const PROFILE_DEFAULT = {
  name: "Priya Sharma",
  email: "priya.sharma@gmail.com",
  phone: "9001234567",
  dob: "1995-03-15",
  gender: "female",
};

export default function AccountPage() {
  const { wishlist, toggleWishlist } = useCart();
  const { user, isAuthenticated, logout, updateProfile } = useAuth();
  const liveCatalogue = isApiConfigured();
  const { data: liveOrders } = useMyOrders(isAuthenticated);
  const ORDERS = liveCatalogue && liveOrders.length > 0 ? liveOrders.map(toDashboardOrder) : MOCK_ORDERS;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("orders");
  const [profile, setProfile] = useState({
    name: user?.firstName + " " + user?.lastName || "Guest User",
    email: user?.email || "",
    phone: user?.phone || "",
    dob: "",
    gender: "female",
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-serif text-gray-900 mb-3">Please Sign In</h2>
          <p className="text-gray-500 mb-6">You need to be logged in to access your account</p>
          <div className="flex gap-3 justify-center">
            <Link 
              href="/login" 
              className="bg-[#881337] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#701a35] transition"
            >
              Sign In
            </Link>
            <Link 
              href="/signup" 
              className="border-2 border-[#881337] text-[#881337] px-6 py-3 rounded-xl font-semibold hover:bg-[#881337] hover:text-white transition"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const wishlistProducts = PRODUCTS.filter((p) => wishlist.includes(p.id));

  const handleSaveProfile = async () => {
    try {
      const [firstName, ...lastNameParts] = profile.name.split(" ");
      await updateProfile({
        firstName,
        lastName: lastNameParts.join(" "),
        phone: profile.phone,
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      {/* ── Header Banner ── */}
      <div className="bg-gradient-to-r from-[#1c1917] via-[#3d2012] to-[#881337] text-white py-10 px-4">
        <div className="max-w-5xl mx-auto flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-2xl font-serif font-bold">
            {profile.name.charAt(0)}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#dfc28c] font-semibold mb-1">My Account</p>
            <h1 className="font-serif text-2xl font-light">{profile.name}</h1>
            <p className="text-white/50 text-xs mt-0.5">{profile.email}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* ── Sidebar Tabs ── */}
          <aside className="sm:w-48 flex-shrink-0">
            <nav className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition border-b border-gray-100 last:border-0 ${
                    activeTab === tab.id
                      ? "bg-[#881337]/5 text-[#881337] font-semibold"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.id === "wishlist" && wishlist.length > 0 && (
                    <span className="ml-auto text-[10px] bg-rose-100 text-rose-600 rounded-full px-1.5 py-0.5 font-bold">
                      {wishlist.length}
                    </span>
                  )}
                </button>
              ))}
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-red-600 hover:bg-red-50 transition"
              >
                <span>🚪</span>
                <span>Logout</span>
              </button>
            </nav>

            {/* Quick links */}
            <div className="mt-4 bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {[
                { label: "Continue Shopping", href: "/products" },
                { label: "Browse Reels", href: "/reels" },
                { label: "Help & Support", href: "#" },
              ].map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="flex items-center justify-between px-4 py-3 text-xs text-gray-600 hover:text-[#881337] hover:bg-gray-50 border-b border-gray-100 last:border-0 transition"
                >
                  <span>{link.label}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              ))}
            </div>
          </aside>

          {/* ── Main Content ── */}
          <main className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* ════ ORDERS TAB ════ */}
                {activeTab === "orders" && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-serif text-gray-900">Order History</h2>
                    {ORDERS.map((order) => (
                      <div key={order.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        {/* Order header */}
                        <div
                          className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition"
                          onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                        >
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="font-mono text-sm font-bold text-gray-900">#{order.id}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{order.date}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[order.statusColor]}`}>
                              {order.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-gray-900 text-sm">₹{order.total.toLocaleString()}</span>
                            <svg
                              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                              className={`text-gray-400 transition-transform duration-200 ${expandedOrder === order.id ? "rotate-180" : ""}`}
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </div>
                        </div>

                        {/* Expanded items */}
                        <AnimatePresence>
                          {expandedOrder === order.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-gray-100 overflow-hidden"
                            >
                              <div className="px-5 py-4 space-y-4">
                                {order.items.map((item, i) => (
                                  <div key={i} className="flex items-center gap-4">
                                    <img src={item.image} alt={item.title}
                                      className="w-14 h-16 object-cover rounded-xl flex-shrink-0 border border-gray-100" />
                                    <div className="flex-1 min-w-0">
                                      <Link href={item.slug ? `/product/${item.slug}` : ("href" in order ? order.href : "/account/orders")}
                                        className="text-sm font-medium text-gray-900 hover:text-[#881337] transition line-clamp-2 block">
                                        {item.title}
                                      </Link>
                                      <p className="text-xs text-gray-500 mt-0.5">Size: {item.size} · Qty: {item.qty}</p>
                                      <p className="text-sm font-bold text-[#881337] mt-1">₹{item.price.toLocaleString()}</p>
                                    </div>
                                  </div>
                                ))}
                                <div className="flex gap-2 pt-2">
                                  {order.status === "Delivered" && (
                                    <button className="flex-1 py-2 text-xs font-semibold border-2 border-[#881337] text-[#881337] rounded-xl hover:bg-[#881337] hover:text-white transition">
                                      Write a Review
                                    </button>
                                  )}
                                  <button className="flex-1 py-2 text-xs font-semibold border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition">
                                    {order.status === "Delivered" ? "Buy Again" : "Track Order"}
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                )}

                {/* ════ WISHLIST TAB ════ */}
                {activeTab === "wishlist" && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-serif text-gray-900">My Wishlist</h2>
                    {wishlistProducts.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                        <div className="text-5xl mb-4">♡</div>
                        <p className="text-gray-500 text-sm mb-4">Your wishlist is empty</p>
                        <Link href="/products"
                          className="inline-block bg-[#881337] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#701a35] transition">
                          Browse Products
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {wishlistProducts.map((product) => (
                          <div key={product.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden group">
                            <div className="relative aspect-[3/4]">
                              <img src={product.image} alt={product.title}
                                className="w-full h-full object-cover" />
                              <button
                                onClick={() => toggleWishlist(product.id)}
                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-rose-600 hover:text-gray-500 transition shadow"
                              >
                                ♥
                              </button>
                            </div>
                            <div className="p-3">
                              <Link href={productHref(product)}
                                className="text-xs font-medium text-gray-900 hover:text-[#881337] transition line-clamp-2 block">
                                {product.title}
                              </Link>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-sm font-bold text-[#881337]">₹{product.price.toLocaleString()}</span>
                                <Link href={productHref(product)}
                                  className="text-[10px] bg-[#881337] text-white px-2 py-1 rounded-lg hover:bg-[#701a35] transition">
                                  View
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ════ PROFILE TAB ════ */}
                {activeTab === "profile" && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-serif text-gray-900">Profile Settings</h2>
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { label: "Full Name", key: "name", type: "text" },
                          { label: "Email Address", key: "email", type: "email" },
                          { label: "Mobile Number", key: "phone", type: "tel" },
                          { label: "Date of Birth", key: "dob", type: "date" },
                        ].map((field) => (
                          <div key={field.key}>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">{field.label}</label>
                            <input
                              type={field.type}
                              value={profile[field.key as keyof typeof profile]}
                              onChange={(e) => setProfile((p) => ({ ...p, [field.key]: e.target.value }))}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337]"
                            />
                          </div>
                        ))}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Gender</label>
                          <select
                            value={profile.gender}
                            onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value }))}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337]"
                          >
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                            <option value="other">Other / Prefer not to say</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center gap-3">
                        <button
                          onClick={handleSaveProfile}
                          className="px-6 py-2.5 bg-[#881337] text-white text-sm font-semibold rounded-xl hover:bg-[#701a35] transition"
                        >
                          Save Changes
                        </button>
                        {profileSaved && (
                          <motion.span
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-emerald-600 text-sm font-medium flex items-center gap-1"
                          >
                            ✓ Saved!
                          </motion.span>
                        )}
                      </div>
                    </div>

                    {/* Change password */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Change Password</h3>
                      <div className="space-y-3">
                        {["Current Password", "New Password", "Confirm New Password"].map((label) => (
                          <div key={label}>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
                            <input type="password" placeholder="••••••••"
                              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337]" />
                          </div>
                        ))}
                        <button className="mt-2 px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition">
                          Update Password
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ════ ADDRESS TAB ════ */}
                {activeTab === "address" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-serif text-gray-900">Saved Addresses</h2>
                      <button className="text-sm text-[#881337] font-semibold hover:underline flex items-center gap-1">
                        <span>+</span> Add New
                      </button>
                    </div>

                    {[
                      {
                        type: "🏠 Home", name: "Priya Sharma", address: "42, Rose Garden Colony, Vaishali Nagar",
                        city: "Jaipur", state: "Rajasthan", pin: "302021", phone: "9001234567", default: true,
                      },
                      {
                        type: "🏢 Work", name: "Priya Sharma", address: "Level 3, Regus Business Centre, MG Road",
                        city: "Jaipur", state: "Rajasthan", pin: "302001", phone: "9001234567", default: false,
                      },
                    ].map((addr, i) => (
                      <div key={i} className={`bg-white rounded-2xl border-2 p-5 ${addr.default ? "border-[#881337]/30" : "border-gray-200"}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-gray-700">{addr.type}</span>
                              {addr.default && (
                                <span className="text-[9px] bg-[#881337] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-gray-900">{addr.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                              {addr.address}, {addr.city}, {addr.state} – {addr.pin}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">📞 {addr.phone}</p>
                          </div>
                          <div className="flex gap-2">
                            <button className="text-xs text-[#881337] hover:underline font-medium">Edit</button>
                            {!addr.default && (
                              <button className="text-xs text-gray-400 hover:text-red-500 transition">Delete</button>
                            )}
                          </div>
                        </div>
                        {!addr.default && (
                          <button className="mt-3 text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
                            Set as Default
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
