import { Link, useLocation } from "wouter";
import { UtensilsCrossed, Search, Moon, Sun, Menu, Shuffle, LogIn, LogOut, Bell } from "lucide-react";
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

  const navLinks: NavLink[] = [
    { href: "/", label: "Home" },
    { href: "/explore", label: "Explore" },
    { href: "/saved", label: "Saved" },
    { href: "/spin", label: "Indecisive Spin", icon: <Shuffle className="w-3.5 h-3.5" />, highlight: true },
  ];

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : user?.email ?? "Account";

  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName ? user.lastName[0] : ""}`.toUpperCase()
    : "?";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-primary p-1.5 rounded-md text-primary-foreground">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight hidden sm:inline-block">Bay Bites</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            link.highlight ? (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full transition-all border ${
                  location === link.href
                    ? "bg-accent text-accent-foreground border-accent"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location === link.href ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            )
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="hidden sm:flex">
            <Link href="/explore">
              <Search className="w-4 h-4" />
              <span className="sr-only">Search</span>
            </Link>
          </Button>

          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle dark mode">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* Notifications bell — only when authenticated */}
          {isAuthenticated && (
            <Button variant="ghost" size="icon" asChild className="relative hidden md:flex" aria-label="Notifications">
              <Link href="/notifications">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            </Button>
          )}

          {/* Auth button — desktop */}
          {!isLoading && (
            isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden md:flex rounded-full">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user?.profileImageUrl ?? undefined} alt={displayName} />
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5 text-sm font-medium">{displayName}</div>
                  {user?.email && (
                    <div className="px-2 pb-1.5 text-xs text-muted-foreground">{user.email}</div>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                    <Link href="/notifications">
                      <Bell className="w-4 h-4" />
                      Notifications
                      {unreadCount > 0 && (
                        <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="gap-2 cursor-pointer">
                    <LogOut className="w-4 h-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" onClick={login} className="hidden md:flex gap-1.5">
                <LogIn className="w-3.5 h-3.5" />
                Log in
              </Button>
            )
          )}

          {/* Mobile Nav */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="w-5 h-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col gap-6 mt-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 text-lg font-medium transition-colors ${
                      location === link.href ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}
                {isAuthenticated && (
                  <Link
                    href="/notifications"
                    className={`flex items-center gap-2 text-lg font-medium transition-colors ${
                      location === "/notifications" ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                )}
                <div className="pt-4 border-t">
                  {!isLoading && (
                    isAuthenticated ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9">
                            <AvatarImage src={user?.profileImageUrl ?? undefined} alt={displayName} />
                            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{displayName}</p>
                            {user?.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={logout} className="gap-2 w-full">
                          <LogOut className="w-3.5 h-3.5" />
                          Log out
                        </Button>
                      </div>
                    ) : (
                      <Button variant="default" size="sm" onClick={login} className="gap-2 w-full">
                        <LogIn className="w-3.5 h-3.5" />
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
