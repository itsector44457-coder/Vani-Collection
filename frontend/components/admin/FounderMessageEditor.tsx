"use client";

import { useState } from "react";
import { api, ApiError, type ContentDoc } from "@/lib/api-client";
import { Alert, ButtonPrimary, Card, Field, TextInput, Textarea } from "@/lib/admin-ui";
import { FOUNDER_KEY, toFounderMessage, type FounderMessage as FounderContent } from "@/lib/founder";
import FounderMessage from "@/components/FounderMessage";
import MediaUploadField from "./MediaUploadField";

export default function FounderMessageEditor({ documents, enabled, onSaved }: { documents: ContentDoc[]; enabled: boolean; onSaved: () => void }) {
  const document = documents.find((item) => item.key === FOUNDER_KEY);
  const [draft, setDraft] = useState<FounderContent | null>(null);
  const form = draft ?? toFounderMessage(document);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const update = (changes: Partial<FounderContent>) => { setDraft({ ...form, ...changes }); setNotice(null); };
  const save = async (status: "draft" | "published") => {
    if (!form.heading.trim() || !form.name.trim() || !form.message.trim()) { setError("Heading, founders’ names and message are required."); return; }
    if (form.image && !/^(https?:\/\/|\/(?!\/))/.test(form.image)) { setError("Use an HTTP(S) image URL or a local path starting with /."); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      await api.upsertContent(FOUNDER_KEY, {
        kind: "page", title: form.heading, subtitle: form.name, body: form.message,
        media: form.image ? [{ url: form.image, alt: form.imageAlt, kind: "image" }] : [],
        blocks: { ...(document?.blocks && typeof document.blocks === "object" ? document.blocks : {}), role: form.role, quote: form.quote, year: form.year }, status,
      });
      onSaved();
      setNotice(status === "published" ? "Founder’s message published. Refresh the homepage to see your changes." : "Saved as draft. The homepage uses the default message until this block is published.");
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Could not save the founder’s message."); }
    finally { setBusy(false); }
  };
  return (
    <Card title="Founder’s Message · Homepage">
      <p className="mb-5 text-sm text-stone-500">A personal letter from the people behind demo. Edit the photo and copy here, then publish to update the homepage.</p>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {notice && <p role="status" className="mb-4 text-sm text-emerald-700">{notice}</p>}
      <fieldset disabled={!enabled || busy} className="grid gap-4 disabled:opacity-60 md:grid-cols-2">
        <Field label="Headline" htmlFor="founder-heading-input"><Textarea id="founder-heading-input" value={form.heading} onChange={(event) => update({ heading: event.target.value })} rows={2} /></Field>
        <Field label="Founders’ names" htmlFor="founder-name"><TextInput id="founder-name" value={form.name} onChange={(event) => update({ name: event.target.value })} /></Field>
        <div className="md:col-span-2"><Field label="Message" htmlFor="founder-body" hint="Separate paragraphs with a blank line."><Textarea id="founder-body" rows={7} value={form.message} onChange={(event) => update({ message: event.target.value })} /></Field></div>
        <Field label="Highlighted quote" htmlFor="founder-quote"><Textarea id="founder-quote" rows={3} value={form.quote} onChange={(event) => update({ quote: event.target.value })} /></Field>
        <div className="space-y-4">
          <Field label="Role / location" htmlFor="founder-role"><TextInput id="founder-role" value={form.role} onChange={(event) => update({ role: event.target.value })} /></Field>
          <Field label="Established year" htmlFor="founder-year"><TextInput id="founder-year" maxLength={20} value={form.year} onChange={(event) => update({ year: event.target.value })} /></Field>
        </div>
        <div>
          <Field label="Founder photo URL" htmlFor="founder-image" hint="Upload your real portrait. A vertical 4:5 photo works best."><TextInput id="founder-image" value={form.image} onChange={(event) => update({ image: event.target.value })} /></Field>
          <MediaUploadField type="image" multiple={false} disabled={!enabled || busy} onUploaded={(urls) => update({ image: urls[0] ?? form.image })} />
        </div>
        <Field label="Photo description (accessibility)" htmlFor="founder-alt"><TextInput id="founder-alt" value={form.imageAlt} onChange={(event) => update({ imageAlt: event.target.value })} /></Field>
      </fieldset>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setPreview(!preview)} className="rounded-lg border border-stone-200 px-4 py-2 text-xs font-semibold" aria-expanded={preview}>{preview ? "Hide preview" : "Preview section"}</button>
        <button type="button" disabled={!enabled || busy} onClick={() => void save("draft")} className="rounded-lg border border-stone-200 px-4 py-2 text-xs font-semibold disabled:opacity-50">Save draft</button>
        <ButtonPrimary type="button" disabled={!enabled || busy} onClick={() => void save("published")}>{busy ? "Saving…" : "Publish founder’s message"}</ButtonPrimary>
        <span className="text-xs text-stone-400">{document?.status === "published" ? "Currently published" : "Default message / unpublished"}</span>
      </div>
      {preview && <div className="mt-6 overflow-hidden rounded-xl"><FounderMessage content={{ ...form, image: /^(https?:\/\/|\/(?!\/))/.test(form.image) ? form.image : "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=1600&q=85" }} /></div>}
    </Card>
  );
}
