import { useRef } from "react";
import { Link, useLocation } from "wouter";
import { UtensilsCrossed, ArrowRight } from "lucide-react";

/** Clicks needed on the hidden footer word to open the admin page. */
const ADMIN_CLICKS = 3;
/** The clicks must all land within this window. */
const ADMIN_CLICK_WINDOW_MS = 1500;

/**
 * The last word of the footer, with no visual hint that it does anything.
 * Clicking it three times in quick succession opens /admin, which asks for a
 * login and still checks ADMIN_EMAILS on the server.
 */
function HiddenAdminWord({ children }: { children: string }) {
  const [, navigate] = useLocation();
  const clicks = useRef<number[]>([]);

  const handleClick = () => {
    const now = Date.now();
    clicks.current = [...clicks.current, now].filter((t) => now - t < ADMIN_CLICK_WINDOW_MS);
    if (clicks.current.length >= ADMIN_CLICKS) {
      clicks.current = [];
      navigate("/admin");
    }
  };

  // The invisible hit area covers the word and the empty space below it down
  // to the bottom of the footer. select-none stops the triple click from
  // highlighting the text.
  return (
    <span className="relative inline-block select-none">
      {children}
      <span
        aria-hidden="true"
        onClick={handleClick}
        className="absolute -left-3 -right-3 -top-2 -bottom-14 md:-bottom-16"
      />
    </span>
  );
}

const LINK_GROUPS = [
  {
    title: "Discover",
    links: [
      { href: "/explore", label: "Explore the directory" },
      { href: "/spin", label: "Indecisive Spin" },
      { href: "/saved", label: "Saved places" },
      { href: "/feedback", label: "Send feedback" },
    ],
  },
  {
    title: "Cities",
    links: [
      { href: "/explore?mode=city&city=Oakland", label: "Oakland" },
      { href: "/explore?mode=city&city=Berkeley", label: "Berkeley" },
      { href: "/explore?mode=city&city=Alameda", label: "Alameda" },
    ],
  },
  {
    title: "For business",
    links: [
      { href: "/partners", label: "Partner with us" },
      { href: "/partners#plans", label: "Plans & pricing" },
      { href: "/partners#apply", label: "Get listed or claim a listing" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-[#1E232E] text-[#F7F4F0] border-t border-white/10 mt-auto">
      <div className="container mx-auto px-4 py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="bg-secondary p-1.5 rounded-lg text-secondary-foreground">
                <UtensilsCrossed className="w-5 h-5" />
              </span>
              <span className="font-bold font-serif text-xl tracking-tight">Spotted Eats</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-[#F7F4F0]/60">
              A directory of independent, locally owned restaurants and food trucks across the Bay Area. No chains, no gatekeeping.
            </p>
            <Link
              href="/partners"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Own a local spot? Get listed
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:contents">
            {LINK_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#F7F4F0]/40 mb-4">
                  {group.title}
                </h3>
                <ul className="space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm font-medium text-[#F7F4F0]/75 transition-colors hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-[#F7F4F0]/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Spotted Eats. All rights reserved.</p>
          <p>
            Made for the people who keep the Bay Area <HiddenAdminWord>delicious.</HiddenAdminWord>
          </p>
        </div>
      </div>
    </footer>
  );
}
