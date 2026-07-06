import { useAuth } from "@workspace/replit-auth-web";
import { useNotifications } from "../hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, LogIn, CheckCheck } from "lucide-react";
import { Link } from "wouter";

const TYPE_LABELS: Record<string, { label: string; class: string }> = {
  closed: { label: "Closed today", class: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  special: { label: "Daily special", class: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  general: { label: "Update", class: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Notifications() {
  const { isAuthenticated, login } = useAuth();
  const { notifications, loading, unreadCount, markRead } = useNotifications(isAuthenticated);

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <Bell className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-muted-foreground max-w-sm">
          Log in to see announcements from venues you follow.
        </p>
        <Button onClick={login} className="gap-2">
          <LogIn className="w-4 h-4" /> Log in
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="w-7 h-7" />
            Notifications
          </h1>
          {unreadCount > 0 && (
            <p className="text-muted-foreground mt-1 text-sm">
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => markRead()}
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl bg-card/50 border-dashed">
          <BellOff className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">No notifications yet</h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Follow venues you love and you'll see their announcements here.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/explore">Explore venues</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const isUnread = !n.readAt;
            const typeInfo = TYPE_LABELS[n.announcement.type] ?? TYPE_LABELS.general;
            return (
              <div
                key={n.id}
                className={`relative border rounded-xl p-4 transition-colors cursor-pointer hover:bg-accent/30 ${
                  isUnread ? "bg-primary/5 border-primary/20" : "bg-card border-border"
                }`}
                onClick={() => isUnread && markRead([n.id])}
              >
                {isUnread && (
                  <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary" />
                )}
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Link
                        href={`/listing/${n.announcement.venueId}`}
                        className="font-semibold text-sm hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {n.announcement.venueName}
                      </Link>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.class}`}
                      >
                        {typeInfo.label}
                      </span>
                    </div>
                    <p className="font-medium text-sm leading-snug mb-0.5">
                      {n.announcement.title}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {n.announcement.body}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {timeAgo(n.announcement.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
