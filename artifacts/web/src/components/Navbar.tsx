import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  UtensilsCrossed,
  Search,
  Moon,
  Sun,
  Menu,
  Shuffle,
  LogIn,
  LogOut,
  Bell,
  Bookmark,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "@workspace/replit-auth-web";
import { useNotifications } from "../hooks/useNotifications";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
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
}

export function Navbar() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  const { unreadCount } = useNotifications(isAuthenticated);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks: NavLink[] = [
    { href: "/", label: "Home" },
    { href: "/explore", label: "Explore" },
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
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="bg-secondary p-1.5 rounded-lg text-secondary-foreground shadow-sm group-hover:scale-105 transition-transform duration-300">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <span className="font-bold font-serif text-xl tracking-tight hidden sm:inline-block">eat local.</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            link.highlight ? (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 text-sm font-bold px-4 py-1.5 rounded-full transition-all border ${
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
                className={`text-sm font-semibold transition-colors hover:text-primary ${
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

          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle dark mode" className={`rounded-full transition-colors ${location === '/' ? 'text-white hover:bg-white/10' : 'hover:bg-muted/50'}`}>
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

          {/* Desktop account menu */}
          {!isLoading && (
            isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className={`hidden md:flex rounded-full transition-colors ${location === '/' ? 'hover:bg-white/10' : 'hover:bg-muted/50'}`}>
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

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="gap-2.5 cursor-pointer py-2 focus:bg-destructive/10 focus:text-destructive">
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium">Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className={`hidden md:flex gap-2 rounded-full font-semibold px-4 transition-colors ${location === '/' ? 'border-white/20 text-white hover:bg-white/10' : 'border-border hover:bg-muted/50'}`}>
                    <User className="w-4 h-4" />
                    Menu
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-border/60">
                  <DropdownMenuItem asChild className="gap-2.5 cursor-pointer py-2 focus:bg-muted">
                    <Link href="/saved">
                      <Bookmark className="w-4 h-4" />
                      <span className="font-medium">Saved</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={login} className="gap-2.5 cursor-pointer py-2 focus:bg-primary focus:text-primary-foreground font-medium">
                    <LogIn className="w-4 h-4" />
                    Log in
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          )}

          {/* Mobile hamburger sheet */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden rounded-full hover:bg-muted/50 transition-colors">
                <Menu className="w-5 h-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="border-l-border/60">
              <div className="flex flex-col gap-6 mt-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 text-lg font-semibold transition-colors py-1 ${
                      location === link.href ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}

                <Link
                  href="/saved"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 text-lg font-semibold transition-colors py-1 ${
                    location === "/saved" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Bookmark className="w-5 h-5" />
                  Saved
                </Link>

                {isAuthenticated && (
                  <Link
                    href="/notifications"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 text-lg font-semibold transition-colors py-1 ${
                      location === "/notifications" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Bell className="w-5 h-5" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full ml-auto">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                )}

                <div className="pt-6 border-t mt-auto">
                  {!isLoading && (
                    isAuthenticated ? (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={user?.profileImageUrl ?? undefined} alt={displayName} />
                            <AvatarFallback className="text-xs bg-primary text-primary-foreground font-bold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-bold">{displayName}</p>
                            {user?.email && <p className="text-xs text-muted-foreground font-medium">{user.email}</p>}
                          </div>
                        </div>
                        <Button variant="outline" onClick={() => { setMobileMenuOpen(false); logout(); }} className="gap-2 w-full rounded-xl font-semibold border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all">
                          <LogOut className="w-4 h-4" />
                          Log out
                        </Button>
                      </div>
                    ) : (
                      <Button variant="default" onClick={() => { setMobileMenuOpen(false); login(); }} className="gap-2 w-full rounded-xl font-bold shadow-md">
                        <LogIn className="w-4 h-4" />
                        Log in
                      </Button>
                    )
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
