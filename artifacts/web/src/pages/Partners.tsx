import { useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import {
  Search,
  Megaphone,
  Sparkles,
  BadgeCheck,
  Check,
  ArrowRight,
  Store,
  ClipboardCheck,
  Rocket,
  Loader2,
  PartyPopper,
  X,
} from "lucide-react";
import { useListings } from "@workspace/api-client-react";
import type { Venue } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { usePageMeta } from "../hooks/usePageMeta";

type Interest = "listing" | "claim" | "broadcaster" | "featured" | "other";

const INTEREST_OPTIONS: { id: Interest; label: string; hint: string }[] = [
  { id: "listing", label: "Get my business listed", hint: "Free" },
  { id: "claim", label: "Claim an existing listing", hint: "Free" },
  { id: "broadcaster", label: "Broadcaster plan", hint: "$29/mo" },
  { id: "featured", label: "Featured partnership", hint: "Custom" },
  { id: "other", label: "Something else", hint: "Say hi" },
];

const BENEFITS = [
  {
    icon: Search,
    title: "Get found by locals",
    body: "Show up when neighbors search by food, city, or neighborhood, browse the map, or spin the wheel to pick dinner.",
  },
  {
    icon: Megaphone,
    title: "Talk to your regulars",
    body: "Post daily specials, pop-ups, and closures. Everyone who follows you gets it right away in their notifications.",
  },
  {
    icon: Sparkles,
    title: "Stand out on the homepage",
    body: "Featured partners get a spot on the homepage and a dish showcase that puts your signature plate front and center.",
  },
  {
    icon: BadgeCheck,
    title: "Earn the verified badge",
    body: "Claim your listing to keep hours, phone, and website accurate. We add a verified badge so diners know it's really you.",
  },
];

const STEPS = [
  { icon: ClipboardCheck, title: "Apply", body: "Tell us about your spot. It takes about two minutes." },
  { icon: BadgeCheck, title: "We verify", body: "We confirm you're independent and locally owned, then reach out." },
  { icon: Rocket, title: "Go live", body: "Your listing goes up (or gets upgraded) and you can start reaching regulars." },
];

const PLANS = [
  {
    name: "Community",
    price: "Free",
    cadence: "forever",
    blurb: "For every independent, locally owned spot.",
    features: [
      "Full listing page with hours, phone & website",
      "Search, city & neighborhood discovery",
      "Included in the Indecisive Spin wheel",
      "Claim & update your info anytime",
      "Verified owner badge",
    ],
    cta: "Get listed free",
    interest: "listing" as Interest,
    highlight: false,
  },
  {
    name: "Broadcaster",
    price: "$29",
    cadence: "per month",
    blurb: "Keep your regulars in the loop.",
    features: [
      "Everything in Community",
      "Post specials, events & closures",
      "Instant notifications to your followers",
      "Announcements shown on your listing",
      "Cancel anytime",
    ],
    cta: "Start broadcasting",
    interest: "broadcaster" as Interest,
    highlight: true,
  },
  {
    name: "Featured Partner",
    price: "Let's talk",
    cadence: "custom",
    blurb: "Maximum visibility for launches and flagships.",
    features: [
      "Everything in Broadcaster",
      "Homepage featured placement",
      "Dish showcase on the homepage",
      "Launch & event spotlights",
      "A direct line to our team",
    ],
    cta: "Talk to us",
    interest: "featured" as Interest,
    highlight: false,
  },
];

const FAQS = [
  {
    q: "Who can be listed?",
    a: "Independent, locally owned restaurants, cafes, bars, and food trucks in the Bay Area. No national chains and no franchises.",
  },
  {
    q: "Is the basic listing really free?",
    a: "Yes. A Community listing is free and stays free. Paid plans add tools to reach your followers and more visibility. They're optional.",
  },
  {
    q: "My restaurant is already on the site. How do I take it over?",
    a: 'Choose "Claim an existing listing" in the form below and pick your restaurant. Once we verify you\'re the owner or manager, you can update your details and your listing gets the verified badge.',
  },
  {
    q: "How do announcements work?",
    a: "Diners tap Follow on your listing. When you post a special, event, or closure, every follower sees it right away in their notifications, and it's shown on your listing page too.",
  },
  {
    q: "How long does it take?",
    a: "We review new applications within a few business days and reach out by email with next steps.",
  },
];

interface FormState {
  interest: Interest;
  businessName: string;
  venueId: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  website: string;
  message: string;
  company_url: string; // honeypot
}

function VenuePicker({
  listings,
  value,
  onChange,
}: {
  listings: Venue[];
  value: Venue | undefined;
  onChange: (venue: Venue | undefined) => void;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return listings
      .filter((l) => l.name.toLowerCase().includes(q) || l.neighborhood.toLowerCase().includes(q))
      .slice(0, 6);
  }, [listings, query]);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: value.color }}
        >
          {value.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{value.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {value.address}, {value.city}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={() => onChange(undefined)} aria-label="Choose a different listing">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id="venue-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your restaurant's name"
        className="pl-9"
        autoComplete="off"
      />
      {matches.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border bg-popover shadow-lg">
          {matches.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(l);
                  setQuery("");
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
                  style={{ backgroundColor: l.color }}
                >
                  {l.initials}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{l.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {l.neighborhood ? `${l.neighborhood} · ` : ""}
                    {l.city}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && matches.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          No match. Choose "Get my business listed" instead and we'll add you.
        </p>
      )}
    </div>
  );
}

export default function Partners() {
  usePageMeta(
    "Partner with us",
    "List your independent Bay Area restaurant or food truck for free, claim your listing, and reach locals with announcements.",
  );

  const search = useSearch();
  const { data: listings = [] } = useListings();

  const claimId = new URLSearchParams(search).get("claim") ?? "";
  const [form, setForm] = useState<FormState>(() => ({
    interest: claimId ? "claim" : "listing",
    businessName: "",
    venueId: claimId,
    contactName: "",
    email: "",
    phone: "",
    city: "",
    website: "",
    message: "",
    company_url: "",
  }));
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const sortedListings = useMemo(
    () => [...listings].sort((a, b) => a.name.localeCompare(b.name)),
    [listings],
  );
  const claimedVenue = listings.find((l) => l.id === form.venueId);

  const stats = useMemo(() => {
    const cities = new Set(listings.map((l) => l.city.replace(/,\s*CA$/, "")));
    const hoods = new Set(listings.map((l) => l.neighborhood).filter(Boolean));
    return [
      { value: listings.length, label: "independent spots listed" },
      { value: cities.size, label: "Bay Area cities" },
      { value: hoods.size, label: "neighborhoods covered" },
    ];
  }, [listings]);

  const pickPlan = (interest: Interest) => {
    set("interest", interest);
    document.getElementById("apply")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.interest === "claim" && !claimedVenue) {
      setError("Pick the listing you're claiming.");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/partner-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          businessName: form.interest === "claim" && claimedVenue ? claimedVenue.name : form.businessName,
          venueId: form.interest === "claim" ? form.venueId : "",
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

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#1E232E] text-[#F7F4F0]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full border-[48px] border-white/5" />
          <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full border-[40px] border-primary/10" />
        </div>
        <div className="container relative mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl">
            <div className="mb-6 flex items-center gap-2">
              <Store className="h-4 w-4 text-secondary" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#F7F4F0]/70">
                For restaurants & food trucks
              </span>
            </div>
            <h1 className="mb-6 font-serif text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl md:text-7xl">
              Grow with neighbors who <span className="text-primary">already love local.</span>
            </h1>
            <p className="mb-10 max-w-2xl text-lg font-medium text-[#F7F4F0]/80 md:text-xl">
              Eat. Local. Food. is where Bay Area diners go to find independent spots. Get listed free, keep your info
              accurate, and reach your regulars directly.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-14 rounded-xl px-8 text-base font-bold">
                <a href="#apply">
                  Apply to partner <ArrowRight className="ml-1 h-5 w-5" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 rounded-xl border-white/20 bg-transparent px-8 text-base font-bold text-white hover:bg-white/10 hover:text-white"
              >
                <a href="#plans">See plans</a>
              </Button>
            </div>
          </div>

          {listings.length > 0 && (
            <dl className="mt-14 grid max-w-3xl grid-cols-3 gap-4 border-t border-white/10 pt-8">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="font-serif text-3xl font-bold text-secondary md:text-5xl">{s.value}</dd>
                  <dd className="mt-1 text-xs font-medium text-[#F7F4F0]/60 md:text-sm">{s.label}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="mb-12 max-w-2xl">
          <h2 className="mb-4 font-serif text-4xl font-bold tracking-tight md:text-5xl">Why partner with us</h2>
          <p className="text-lg font-medium leading-relaxed text-muted-foreground">
            We only list independent, locally owned businesses, so you're never buried under chains or paid-placement
            noise.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border bg-card p-6 transition-shadow hover:shadow-lg">
              <div className="mb-5 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-serif text-xl font-bold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-muted/40">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <h2 className="mb-10 text-center font-serif text-3xl font-bold tracking-tight md:text-4xl">How it works</h2>
          <ol className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="flex gap-4 md:flex-col md:items-center md:text-center">
                <div className="relative shrink-0">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                    {i + 1}
                  </span>
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-bold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="container mx-auto scroll-mt-20 px-4 py-20 md:py-28">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="mb-4 font-serif text-4xl font-bold tracking-tight md:text-5xl">Simple plans</h2>
          <p className="text-lg font-medium text-muted-foreground">
            Start free. Upgrade when you want to reach more people.
          </p>
        </div>
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-3xl border p-7 md:p-8 ${
                plan.highlight
                  ? "border-primary bg-[#1E232E] text-[#F7F4F0] shadow-2xl shadow-primary/20 lg:-translate-y-3"
                  : "bg-card"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-7 rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
                  Most popular
                </span>
              )}
              <h3 className="font-serif text-2xl font-bold">{plan.name}</h3>
              <p className={`mt-1 text-sm ${plan.highlight ? "text-[#F7F4F0]/70" : "text-muted-foreground"}`}>
                {plan.blurb}
              </p>
              <p className="mt-6 flex items-baseline gap-2">
                <span className="font-serif text-5xl font-bold">{plan.price}</span>
                <span className={`text-sm ${plan.highlight ? "text-[#F7F4F0]/60" : "text-muted-foreground"}`}>
                  {plan.cadence}
                </span>
              </p>
              <ul className="my-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? "text-secondary" : "text-primary"}`} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                size="lg"
                onClick={() => pickPlan(plan.interest)}
                variant={plan.highlight ? "default" : "outline"}
                className="h-12 w-full rounded-xl font-bold"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Apply + FAQ */}
      <section className="border-t bg-muted/30">
        <div className="container mx-auto grid gap-12 px-4 py-20 md:py-24 lg:grid-cols-[1.25fr_1fr]">
          <div id="apply" className="scroll-mt-20">
            <h2 className="mb-3 font-serif text-4xl font-bold tracking-tight">Apply to partner</h2>
            <p className="mb-8 text-muted-foreground">
              Tell us about your spot and we'll be in touch within a few business days.
            </p>

            {status === "sent" ? (
              <div className="rounded-3xl border bg-card p-8 text-center md:p-12" role="status">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <PartyPopper className="h-8 w-8" />
                </div>
                <h3 className="mb-2 font-serif text-3xl font-bold">Thanks, we got it!</h3>
                <p className="mx-auto mb-8 max-w-md text-muted-foreground">
                  We'll review your application and email <strong className="text-foreground">{form.email}</strong>{" "}
                  with next steps.
                </p>
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/explore">Browse the directory</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border bg-card p-5 sm:p-8" noValidate>
                <fieldset>
                  <legend className="mb-3 text-sm font-semibold">What are you interested in?</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {INTEREST_OPTIONS.map((opt) => (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                          form.interest === opt.id
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "hover:border-foreground/30"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="interest"
                            value={opt.id}
                            checked={form.interest === opt.id}
                            onChange={() => set("interest", opt.id)}
                            className="accent-[hsl(var(--primary))]"
                          />
                          {opt.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{opt.hint}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {form.interest === "claim" ? (
                  <div className="space-y-2">
                    <Label htmlFor="venue-search">Which listing is yours? *</Label>
                    <VenuePicker
                      listings={sortedListings}
                      value={claimedVenue}
                      onChange={(v) => set("venueId", v?.id ?? "")}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business name *</Label>
                    <Input
                      id="businessName"
                      required
                      maxLength={120}
                      value={form.businessName}
                      onChange={(e) => set("businessName", e.target.value)}
                      placeholder="e.g. Tacos El Gordo"
                    />
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Your name *</Label>
                    <Input
                      id="contactName"
                      required
                      maxLength={120}
                      autoComplete="name"
                      value={form.contactName}
                      onChange={(e) => set("contactName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      maxLength={200}
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      maxLength={40}
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      maxLength={80}
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                      placeholder="Oakland"
                    />
                  </div>
                </div>

                {form.interest !== "claim" && (
                  <div className="space-y-2">
                    <Label htmlFor="website">Website or Instagram</Label>
                    <Input
                      id="website"
                      maxLength={300}
                      value={form.website}
                      onChange={(e) => set("website", e.target.value)}
                      placeholder="https://"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="message">Anything else we should know?</Label>
                  <Textarea
                    id="message"
                    rows={4}
                    maxLength={2000}
                    value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                    placeholder="What makes your place special, the best time to reach you, etc."
                  />
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
                    "Submit application"
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  We only use your details to follow up about your listing.
                </p>
              </form>
            )}
          </div>

          <div>
            <h2 className="mb-6 font-serif text-3xl font-bold tracking-tight">Questions</h2>
            <Accordion type="single" collapsible className="rounded-3xl border bg-card px-5 sm:px-6">
              {FAQS.map((faq, i) => (
                <AccordionItem key={faq.q} value={`faq-${i}`} className={i === FAQS.length - 1 ? "border-b-0" : ""}>
                  <AccordionTrigger className="text-left font-semibold hover:no-underline">{faq.q}</AccordionTrigger>
                  <AccordionContent className="leading-relaxed text-muted-foreground">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </div>
  );
}
