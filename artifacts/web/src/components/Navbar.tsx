import { Link, useLocation } from "wouter";
import {
  Search,
  Moon,
  Sun,
  Shuffle,
  LogOut,
  Bell,
  Bookmark,
  Store,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "@workspace/replit-auth-web";
import { useNotifications } from "../hooks/useNotifications";
import { useIsAdmin } from "../hooks/useIsAdmin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavLink {
  href: string;
  label: string;
  icon?: React.ReactNode;
  highlight?: boolean;
  /** Extra classes for the desktop link (e.g. hide at tighter widths) */
  desktopClass?: string;
}

export function Navbar() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useNotifications(isAuthenticated);
  const { isAdmin } = useIsAdmin(isAuthenticated);

  const navLinks: NavLink[] = [
    { href: "/", label: "Home", desktopClass: "hidden lg:inline" },
    { href: "/explore", label: "Explore" },
    { href: "/partners", label: "For Business", icon: <Store className="w-4 h-4" /> },
    { href: "/spin", label: "Indecisive Spin", icon: <Shuffle className="w-3.5 h-3.5" />, highlight: true },
  ];

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : user?.email ?? "Account";

  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName ? user.lastName[0] : ""}`.toUpperCase()
    : "?";

  return (
    <header className={`sticky top-0 z-50 w-full border-b transition-colors duration-300 ${
      location === '/' ? 'bg-[#1E232E] text-[#F7F4F0] border-white/10' : 'bg-background/95 backdrop-blur-lg border-border'
    }`}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" aria-label="Spotted Eats home" className="transition-opacity hover:opacity-85">
          <Logo tone={location === '/' ? 'onDark' : 'auto'} />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-7">
          {navLinks.map((link) => (
            link.highlight ? (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 text-sm font-bold px-4 py-1.5 rounded-full transition-all border whitespace-nowrap ${
                  location === link.href
                    ? "bg-secondary text-secondary-foreground border-secondary shadow-sm"
                    : location === '/' ? "border-white/20 text-white/70 hover:text-white hover:border-white/40 hover:bg-white/10" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/30"
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-semibold transition-colors hover:text-primary whitespace-nowrap ${link.desktopClass ?? ""} ${
                  location === link.href ? "text-primary" : location === '/' ? "text-white/70 hover:text-white" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            )
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className={`hidden sm:flex rounded-full transition-colors ${location === '/' ? 'text-white hover:bg-white/10' : 'hover:bg-muted/50'}`}>
            <Link href="/explore">
              <Search className="w-4 h-4" />
              <span className="sr-only">Search</span>
            </Link>
          </Button>

          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle dark mode" className={`h-11 w-11 rounded-full transition-colors ${location === '/' ? 'text-white hover:bg-white/10' : 'hover:bg-muted/50'}`}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* Notifications bell */}
          {isAuthenticated && (
            <Button variant="ghost" size="icon" asChild className={`relative hidden md:flex rounded-full transition-colors ${location === '/' ? 'text-white hover:bg-white/10' : 'hover:bg-muted/50'}`} aria-label="Notifications">
              <Link href="/notifications">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center leading-none shadow-sm">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            </Button>
          )}

          {/* Keep signed-in account actions accessible on every screen size. */}
          {!isLoading && isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Account" className={`h-11 w-11 rounded-full transition-colors ${location === '/' ? 'hover:bg-white/10' : 'hover:bg-muted/50'}`}>
                    <Avatar className="w-8 h-8 ring-2 ring-transparent hover:ring-primary/20 transition-all">
                      <AvatarImage src={user?.profileImageUrl ?? undefined} alt={displayName} />
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border-border/60">
                  <div className="px-3 py-2.5">
                    <p className="text-sm font-bold">{displayName}</p>
                    {user?.email && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5 font-medium">{user.email}</p>
                    )}
                  </div>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild className="gap-2.5 cursor-pointer py-2 focus:bg-muted">
                    <Link href="/saved">
                      <Bookmark className="w-4 h-4" />
                      <span className="font-medium">Saved</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild className="gap-2.5 cursor-pointer py-2 focus:bg-muted">
                    <Link href="/notifications">
                      <Bell className="w-4 h-4" />
                      <span className="font-medium">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  </DropdownMenuItem>

                  {isAdmin && (
                    <DropdownMenuItem asChild className="gap-2.5 cursor-pointer py-2 focus:bg-muted">
                      <Link href="/admin">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="font-medium">Admin</span>
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="gap-2.5 cursor-pointer py-2 focus:bg-destructive/10 focus:text-destructive">
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium">Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          )}

          <Button
            variant="ghost"
            size="icon"
            asChild
            className={`h-11 w-11 shrink-0 rounded-full transition-colors ${location === '/' ? 'text-white hover:bg-white/10' : 'hover:bg-muted/50'}`}
          >
            <Link href="/saved" aria-label="Saved places" aria-current={location === "/saved" ? "page" : undefined} data-testid="navbar-saved">
              <Bookmark className="w-5 h-5" fill={location === "/saved" ? "currentColor" : "none"} aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
