import { useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { MessageSquareHeart, PencilLine, MessageCircle, Loader2, PartyPopper } from "lucide-react";
import { useListings } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { VenuePicker } from "../components/VenuePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePageMeta } from "../hooks/usePageMeta";

type Category = "listing_edit" | "general";

const CATEGORIES: { id: Category; label: string; hint: string; icon: typeof PencilLine }[] = [
  { id: "listing_edit", label: "Edit to a listing", hint: "Wrong hours, moved, closed…", icon: PencilLine },
  { id: "general", label: "General feedback", hint: "Ideas, problems, kind words", icon: MessageCircle },
];

const TOPICS: Record<Category, { id: string; label: string }[]> = {
  listing_edit: [
    { id: "hours", label: "Hours" },
    { id: "address", label: "Address or map pin" },
    { id: "phone", label: "Phone number" },
    { id: "website", label: "Website" },
    { id: "details", label: "Description or tags" },
    { id: "closed", label: "Permanently closed" },
    { id: "other", label: "Something else" },
  ],
  general: [
    { id: "idea", label: "Idea or suggestion" },
    { id: "problem", label: "Something isn't working" },
    { id: "praise", label: "Something I love" },
    { id: "other", label: "Something else" },
  ],
};

const MESSAGE_PLACEHOLDERS: Record<Category, string> = {
  listing_edit: "What should it say instead? e.g. \"They're open until 10pm on Fridays now.\"",
  general: "Tell us what's on your mind.",
};

interface FormState {
  category: Category;
  venueId: string;
  topic: string;
  message: string;
  name: string;
  email: string;
  company_url: string; // honeypot
}

export default function Feedback() {
  usePageMeta(
    "Feedback",
    "Suggest a correction to a listing or share feedback about Spotted Eats.",
  );

  const search = useSearch();
  const { data: listings = [] } = useListings();
  const { user } = useAuth();

  const listingId = new URLSearchParams(search).get("listing") ?? "";
  const [form, setForm] = useState<FormState>(() => ({
    category: listingId ? "listing_edit" : "general",
    venueId: listingId,
    topic: listingId ? "hours" : "idea",
    message: "",
    name: "",
    email: "",
    company_url: "",
  }));
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setCategory = (category: Category) =>
    setForm((f) => ({ ...f, category, topic: TOPICS[category][0].id }));

  const sortedListings = useMemo(
    () => [...listings].sort((a, b) => a.name.localeCompare(b.name)),
    [listings],
  );
  const venue = listings.find((l) => l.id === form.venueId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.category === "listing_edit" && !venue) {
      setError("Pick the listing that needs an edit.");
      return;
    }
    if (!form.message.trim()) {
      setError("Please tell us a bit more in the message.");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          venueId: form.category === "listing_edit" ? form.venueId : "",
          email: form.email || user?.email || "",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong. Please try again.");
      }
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("idle");
    }
  };

  const reset = () => {
    setForm((f) => ({ ...f, message: "", topic: TOPICS[f.category][0].id }));
    setStatus("idle");
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 md:py-16">
      <div className="mb-8">
        <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
          <MessageSquareHeart className="h-6 w-6" />
        </div>
        <h1 className="mb-3 font-serif text-4xl font-bold tracking-tight md:text-5xl">Send us feedback</h1>
        <p className="text-lg text-muted-foreground">
          Spotted something out of date on a listing, or have thoughts about the site? We read every note.
        </p>
      </div>

      {status === "sent" ? (
        <div className="rounded-3xl border bg-card p-8 text-center md:p-12" role="status">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PartyPopper className="h-8 w-8" />
          </div>
          <h2 className="mb-2 font-serif text-3xl font-bold">Thanks for the heads-up!</h2>
          <p className="mx-auto mb-8 max-w-md text-muted-foreground">
            {form.category === "listing_edit"
              ? `We'll check the details for ${venue?.name ?? "this listing"} and update it.`
              : "Your feedback helps us make the directory better for everyone."}
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            {venue && form.category === "listing_edit" ? (
              <Button asChild variant="outline" className="rounded-full">
                <Link href={`/listing/${venue.id}`}>Back to {venue.name}</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/explore">Browse the directory</Link>
              </Button>
            )}
            <Button variant="ghost" className="rounded-full" onClick={reset}>
              Send more feedback
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border bg-card p-5 sm:p-8" noValidate>
          <fieldset>
            <legend className="mb-3 text-sm font-semibold">What kind of feedback?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {CATEGORIES.map(({ id, label, hint, icon: Icon }) => (
                <label
                  key={id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
                    form.category === id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:border-foreground/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={id}
                    checked={form.category === id}
                    onChange={() => setCategory(id)}
                    className="sr-only"
                  />
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${form.category === id ? "text-primary" : "text-muted-foreground"}`} />
                  <span>
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="block text-xs text-muted-foreground">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {form.category === "listing_edit" && (
            <div className="space-y-2">
              <Label htmlFor="venue-search">Which listing? *</Label>
              <VenuePicker
                listings={sortedListings}
                value={venue}
                onChange={(v) => set("venueId", v?.id ?? "")}
                emptyHint="No match. If a spot is missing from the directory, choose General feedback and tell us about it."
              />
            </div>
          )}

          <fieldset>
            <legend className="mb-3 text-sm font-semibold">
              {form.category === "listing_edit" ? "What needs fixing?" : "What's it about?"}
            </legend>
            <div className="flex flex-wrap gap-2">
              {TOPICS[form.category].map((t) => (
                <label
                  key={t.id}
                  className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
                    form.topic === t.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="topic"
                    value={t.id}
                    checked={form.topic === t.id}
                    onChange={() => set("topic", t.id)}
                    className="sr-only"
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="message">Details *</Label>
            <Textarea
              id="message"
              rows={5}
              required
              maxLength={2000}
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              placeholder={MESSAGE_PLACEHOLDERS[form.category]}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                maxLength={120}
                autoComplete="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                maxLength={200}
                autoComplete="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder={user?.email ?? "If you'd like a reply"}
              />
            </div>
          </div>

          {/* Honeypot: hidden from people, tempting to bots */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="company_url">Company URL</label>
            <input
              id="company_url"
              tabIndex={-1}
              autoComplete="off"
              value={form.company_url}
              onChange={(e) => set("company_url", e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={status === "sending"}
            className="h-14 w-full rounded-xl text-base font-bold"
          >
            {status === "sending" ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending…
              </>
            ) : (
              "Send feedback"
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Name and email are optional. We only use them if we need to follow up.
          </p>
        </form>
      )}
    </div>
  );
}
