"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ReelsSidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Home",
      href: "/",
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          {!active && <polyline points="9 22 9 12 15 12 15 22" />}
        </svg>
      ),
    },
    {
      name: "Reels",
      href: "/reels",
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
          <line x1="7" y1="2" x2="7" y2="22" />
          <line x1="17" y1="2" x2="17" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="2" y1="7" x2="7" y2="7" />
          <line x1="2" y1="17" x2="7" y2="17" />
          <line x1="17" y1="17" x2="22" y2="17" />
          <line x1="17" y1="7" x2="22" y2="7" />
        </svg>
      ),
    },
    {
      name: "Shop",
      href: "/",
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-[245px] h-screen fixed left-0 top-0 bg-white z-50 border-r border-gray-100">
      {/* Logo Section */}
      <div className="px-6 py-8 border-b border-gray-50">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-rose-900 via-rose-800 to-rose-900 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-900/20 group-hover:shadow-xl group-hover:shadow-rose-900/30 transition-all duration-300 group-hover:scale-105">
            <span className="text-white font-serif text-xl font-bold">V</span>
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-xl font-bold text-gray-900 tracking-tight">Vani</span>
            <span className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">Collection</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-8">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                    isActive
                      ? "bg-gray-900 text-white shadow-lg shadow-gray-900/20"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-rose-600 rounded-r-full" />
                  )}
                  
                  <span className={`transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
                    {item.icon(isActive)}
                  </span>
                  <span className={`text-[15px] font-medium ${isActive ? "font-semibold" : ""}`}>
                    {item.name}
                  </span>
                  
                  {/* Hover shine effect */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer Branding */}
      <div className="px-6 py-6 border-t border-gray-50">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gradient-to-br from-gray-50 to-white border border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-100 to-rose-50 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-800">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] text-gray-900 font-bold tracking-wide">VANI COLLECTION</p>
            <p className="text-[10px] text-gray-500">Artisanal Luxury</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
