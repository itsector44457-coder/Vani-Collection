"use client";

import { useMemo, useState } from "react";
import { Badge, Card } from "@/lib/admin-ui";
import AdminDataBadge from "@/components/admin/AdminDataBadge";
import { api, type AdminCustomer, type Paginated } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";

const DEMO_CUSTOMERS: Paginated<AdminCustomer> = {
  data: [
    { _id: "c1", email: "priya@example.com", firstName: "Priya", lastName: "Sharma", phone: "9876500001", roles: ["customer"], status: "active", createdAt: new Date("2024-03-11").toISOString() },
    { _id: "c2", email: "meera@example.com", firstName: "Meera", lastName: "Iyer", phone: "9876500002", roles: ["customer"], status: "active", createdAt: new Date("2024-06-02").toISOString() },
    { _id: "c3", email: "ananya@example.com", firstName: "Ananya", lastName: "Bose", phone: "9876500003", roles: ["customer"], status: "active", createdAt: new Date("2024-01-19").toISOString() },
    { _id: "c4", email: "riya@example.com", firstName: "Riya", lastName: "Kapoor", phone: "9876500004", roles: ["customer"], status: "blocked", createdAt: new Date("2024-09-06").toISOString() },
    { _id: "c5", email: "support@vanicollection.in", firstName: "Vani", lastName: "Support", phone: "9876500005", roles: ["support", "admin"], status: "active", createdAt: new Date("2024-02-01").toISOString() },
  ],
  meta: { total: 5 },
};

const initials = (customer: AdminCustomer) => {
  const letters = [customer.firstName, customer.lastName]
    .filter((part): part is string => Boolean(part))
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return letters || customer.email.slice(0, 2).toUpperCase();
};

const monthYear = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

export default function CustomersPage() {
  const [q, setQ] = useState("");
  const customers = useApiResource<Paginated<AdminCustomer>>((signal) => api.customers({ limit: 100 }, signal), DEMO_CUSTOMERS);

  const rows = customers.data.data;
  const segments = useMemo(() => {
    const staff = rows.filter((customer) => customer.roles.some((role) => role !== "customer"));
    const blocked = rows.filter((customer) => customer.status === "blocked");
    const newThisMonth = rows.filter((customer) => {
      const created = new Date(customer.createdAt);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    });
    return { total: rows.length, staff: staff.length, blocked: blocked.length, newThisMonth: newThisMonth.length };
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (customer) =>
          q === "" ||
          customer.email.toLowerCase().includes(q.toLowerCase()) ||
          `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.toLowerCase().includes(q.toLowerCase()) ||
          (customer.phone ?? "").includes(q)
      ),
    [rows, q]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">Audience</p>
          <h1 className="mt-1 font-serif text-[26px] font-semibold tracking-tight">Customers</h1>
          <p className="mt-1 text-[13px] text-stone-500">
            {segments.total} accounts · {segments.newThisMonth} joined this month
          </p>
        </div>
        <AdminDataBadge resource={customers} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">Total accounts</p>
          <p className="mt-2 font-serif text-[26px] font-semibold">{segments.total}</p>
          <p className="mt-1 text-[11.5px] text-stone-500">Registered customers and staff</p>
        </Card>
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">Staff accounts</p>
          <p className="mt-2 font-serif text-[26px] font-semibold">{segments.staff}</p>
          <p className="mt-1 text-[11.5px] text-stone-500">Roles managed in the backend</p>
        </Card>
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">Blocked</p>
          <p className="mt-2 font-serif text-[26px] font-semibold">{segments.blocked}</p>
          <p className="mt-1 text-[11.5px] text-stone-500">Sign-in disabled for these accounts</p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#ebe6de] bg-white px-3 py-2 focus-within:border-[#dfc28c] sm:max-w-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-stone-400">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <label htmlFor="customer-search" className="sr-only">
              Search customers
            </label>
            <input
              id="customer-search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search by name, email or phone…"
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-stone-400"
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#f0ebe3] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 pr-4">Phone</th>
                <th className="pb-3 pr-4">Roles</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebe3]">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[12.5px] text-stone-500">
                    No customers match this search.
                  </td>
                </tr>
              )}
              {filtered.map((customer) => (
                <tr key={customer._id} className="transition hover:bg-[#faf7f2]/60">
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#faf7f2] text-[11px] font-bold text-stone-600 ring-1 ring-[#ebe6de]">
                        {initials(customer)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold">
                          {[customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Unnamed customer"}
                        </p>
                        <p className="truncate text-[11px] text-stone-500">{customer.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 text-[12.5px] text-stone-600">{customer.phone || "—"}</td>
                  <td className="py-3.5 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {customer.roles.map((role) => (
                        <Badge key={role} tone={role === "customer" ? "neutral" : "gold"}>
                          {role.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 pr-4">
                    <Badge tone={customer.status === "active" ? "success" : "danger"} dot>
                      {customer.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 pr-4 text-[12.5px] text-stone-600">{monthYear(customer.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 border-t border-[#f0ebe3] pt-4 text-[11.5px] text-stone-500">
          Lifetime value and per-customer order history live in <code>GET /api/admin/customers/:id</code> —
          {" "}
          {customers.source === "live" ? "this table is reading the live backend." : "connect the backend to load real customers."}
        </p>
      </Card>
    </div>
  );
}
