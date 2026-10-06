"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  ButtonGhost,
  ButtonPrimary,
  Card,
  Checkbox,
  EmptyState,
  Field,
  Modal,
  PageHeading,
  StatCard,
  TextInput,
  type BadgeTone,
} from "@/lib/admin-ui";
import AdminDataBadge from "@/components/admin/AdminDataBadge";
import {
  ageInDays,
  api,
  ApiError,
  ASSIGNABLE_STAFF_ROLES,
  formatRelativeTime,
  ROLE_LABELS,
  type StaffUser,
} from "@/lib/api-client";
import { useAdminSession } from "@/lib/use-admin-session";
import { useApiResource } from "@/lib/use-api";

const DEMO_STAFF: StaffUser[] = [
  { _id: "s1", email: "admin@vanicollection.in", firstName: "Vani", lastName: "Sharma", roles: ["super_admin"], status: "active", lastLoginAt: new Date(Date.now() - 3600e3 * 2).toISOString(), createdAt: new Date("2025-11-04").toISOString() },
  { _id: "s2", email: "support@vanicollection.in", firstName: "Rhea", lastName: "Kulkarni", roles: ["support"], status: "active", lastLoginAt: new Date(Date.now() - 3600e3 * 9).toISOString(), createdAt: new Date("2026-01-19").toISOString() },
  { _id: "s3", email: "warehouse@vanicollection.in", firstName: "Imran", lastName: "Sheikh", roles: ["warehouse", "catalog_manager"], status: "active", lastLoginAt: new Date(Date.now() - 86400e3 * 1).toISOString(), createdAt: new Date("2026-02-02").toISOString() },
  { _id: "s4", email: "finance@vanicollection.in", firstName: "Nikhil", lastName: "Verma", roles: ["finance"], status: "active", createdAt: new Date("2026-03-11").toISOString() },
  { _id: "s5", email: "intern@vanicollection.in", firstName: "Tara", lastName: "Nair", roles: ["support"], status: "blocked", createdAt: new Date("2026-06-27").toISOString() },
];

/** What each role can actually reach — shown next to the picker so grants are deliberate. */
const ROLE_CAPABILITIES: Record<string, string> = {
  support: "Orders, customers, returns queue, review moderation, email log",
  warehouse: "Inventory adjustments, packing slips, order status updates",
  catalog_manager: "Products, variants, pricing, content blocks",
  finance: "Coupons, refunds, reports, GST summary",
  admin: "Everything above plus staff management and the audit log",
};

const roleTone = (role: string): BadgeTone =>
  role === "super_admin" ? "danger" : role === "admin" ? "warning" : role === "finance" ? "gold" : "info";

const fullName = (user: StaffUser): string =>
  [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email.split("@")[0];

export default function StaffPage() {
  const session = useAdminSession();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<string[]>(["support"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const staff = useApiResource<{ data: StaffUser[] }>((signal) => api.staff(signal), { data: DEMO_STAFF });
  const rows = staff.data.data;

  const stats = useMemo(() => {
    const active = rows.filter((user) => user.status === "active");
    const admins = rows.filter((user) => user.roles.includes("admin") || user.roles.includes("super_admin"));
    const stale = active.filter((user) => ageInDays(user.lastLoginAt) > 30);
    return { total: rows.length, active: active.length, admins: admins.length, stale: stale.length };
  }, [rows]);

  const byRole = useMemo(() => {
    const counts = new Map<string, number>();
    for (const user of rows) for (const role of user.roles) counts.set(role, (counts.get(role) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const toggleRole = (role: string) =>
    setRoles((current) => (current.includes(role) ? current.filter((value) => value !== role) : [...current, role]));

  const submit = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid work email address.");
      return;
    }
    if (firstName.trim().length < 1) {
      setError("A first name is required — it appears on audit entries and customer replies.");
      return;
    }
    if (password.length < 8) {
      setError("The temporary password needs at least 8 characters.");
      return;
    }
    if (roles.length === 0) {
      setError("Pick at least one role, otherwise the account cannot reach anything.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await api.createStaff({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        password,
        roles,
      });
      setNotice(`${fullName(created.data)} can now sign in with the temporary password.`);
      setInviteOpen(false);
      setEmail("");
      setFirstName("");
      setLastName("");
      setPassword("");
      setRoles(["support"]);
      staff.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.code === "EMAIL_EXISTS"
          ? "That email already has an account. Change its roles from the Customers screen instead."
          : cause instanceof ApiError
            ? cause.message
            : "Could not create this staff account"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="System"
        title="Staff accounts"
        subtitle="Everyone who can reach this console. Roles are cumulative, and every privileged write is recorded against the account that made it."
        action={
          <ButtonPrimary onClick={() => setInviteOpen(true)} disabled={staff.source !== "live"}>
            Add staff account
          </ButtonPrimary>
        }
      />
      <div className="flex justify-end">
        <AdminDataBadge resource={staff} />
      </div>

      {staff.source !== "live" && (
        <Alert tone="warning">Demo accounts. Connect the backend and sign in as admin to create real staff accounts.</Alert>
      )}
      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      {stats.admins > 2 && (
        <Alert tone="info">
          {stats.admins} accounts hold admin or super admin. Keep that number as small as the team honestly needs —
          admins can read the audit log and grant more access.
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Staff accounts" value={String(stats.total)} hint="Everyone except customers" />
        <StatCard label="Active" value={String(stats.active)} hint="Can sign in right now" tone="success" />
        <StatCard label="Admins" value={String(stats.admins)} hint="admin or super_admin" tone="warning" />
        <StatCard
          label="Not seen in 30 days"
          value={String(stats.stale)}
          hint="Candidates for blocking"
          tone={stats.stale ? "danger" : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Accounts" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#f0ebe3] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                  <th className="pb-3 pr-4">Person</th>
                  <th className="pb-3 pr-4">Roles</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Last sign-in</th>
                  <th className="pb-3">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ebe3]">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState title="No staff accounts" hint="Add the first one to get started." />
                    </td>
                  </tr>
                )}
                {rows.map((user) => {
                  const isYou = Boolean(session.user?.email && session.user.email.toLowerCase() === user.email.toLowerCase());
                  return (
                    <tr key={user._id} className="transition hover:bg-[#faf7f2]/60">
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#faf7f2] font-serif text-[13px] font-semibold text-[#881337] ring-1 ring-[#ebe6de]">
                            {fullName(user).slice(0, 1).toUpperCase()}
                          </span>
                          <span>
                            <span className="block text-[13px] font-semibold text-[#14100f]">
                              {fullName(user)}
                              {isYou && <span className="ml-1.5 text-[11px] font-normal text-stone-400">(you)</span>}
                            </span>
                            <span className="block text-[11.5px] text-stone-500">{user.email}</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="flex flex-wrap gap-1.5">
                          {user.roles.map((role) => (
                            <Badge key={role} tone={roleTone(role)}>
                              {ROLE_LABELS[role] ?? role}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <Badge tone={user.status === "active" ? "success" : user.status === "blocked" ? "danger" : "warning"} dot>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 pr-4">
                        {user.lastLoginAt ? (
                          <>
                            <p className="text-[12px] text-[#14100f]">{formatRelativeTime(user.lastLoginAt)}</p>
                            <p className="text-[11px] text-stone-400">
                              {new Date(user.lastLoginAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                            </p>
                          </>
                        ) : (
                          <p className="text-[12px] text-stone-400">Never signed in</p>
                        )}
                      </td>
                      <td className="py-3.5 text-[12px] text-stone-500">
                        {new Date(user.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 border-t border-[#f0ebe3] pt-4 text-[11.5px] text-stone-500">
            Backed by <code>GET /api/admin/staff</code> and <code>POST /api/admin/staff</code>, both restricted to admin
            and super admin. Role changes to an existing account go through{" "}
            <code>PATCH /api/admin/customers/:id</code> on the Customers screen; only a super admin can grant
            super_admin.
          </p>
        </Card>

        <div className="space-y-4">
          <Card title="Roles in use">
            {byRole.length === 0 ? (
              <EmptyState title="No roles granted yet" />
            ) : (
              <div className="space-y-2">
                {byRole.map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between gap-3">
                    <span className="text-[12.5px] font-medium text-stone-600">{ROLE_LABELS[role] ?? role}</span>
                    <span className="text-[12.5px] font-bold text-[#14100f]">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Offboarding checklist">
            <ul className="space-y-2 text-[12px] leading-relaxed text-stone-500">
              <li>Block the account from the Customers screen — it stops sign-in without losing history.</li>
              <li>Filter the audit log by their email before you do, if you need to see what they changed.</li>
              <li>Reassign anything they owned: open returns, pending refunds, draft content blocks.</li>
              <li>Rotate any shared credentials they knew (ERP, Shiprocket, SMTP).</li>
            </ul>
          </Card>
        </div>
      </div>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Add a staff account"
        description="The account is created immediately with the password below. Share it over a separate channel and ask them to change it on first sign-in."
        footer={
          <>
            <ButtonGhost onClick={() => setInviteOpen(false)}>Cancel</ButtonGhost>
            <ButtonPrimary onClick={() => void submit()} disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </ButtonPrimary>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Work email" htmlFor="staff-email">
            <TextInput id="staff-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@vanicollection.in" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="First name" htmlFor="staff-first">
              <TextInput id="staff-first" value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Rhea" />
            </Field>
            <Field label="Last name" htmlFor="staff-last">
              <TextInput id="staff-last" value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Kulkarni" />
            </Field>
          </div>

          <Field label="Temporary password" htmlFor="staff-password" hint="At least 8 characters. Stored as a bcrypt hash.">
            <TextInput id="staff-password" type="text" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Jaipur2026!" className="font-mono" />
          </Field>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Roles</p>
            <div className="space-y-2">
              {ASSIGNABLE_STAFF_ROLES.map((role) => (
                <div key={role} className="rounded-xl border border-[#f0ebe3] px-3 py-2.5">
                  <Checkbox label={ROLE_LABELS[role] ?? role} checked={roles.includes(role)} onChange={() => toggleRole(role)} />
                  <p className="mt-1 pl-6 text-[11.5px] leading-relaxed text-stone-500">{ROLE_CAPABILITIES[role]}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-stone-400">
              <code>super_admin</code> cannot be granted here — it is reserved for the account seeded at install time.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
