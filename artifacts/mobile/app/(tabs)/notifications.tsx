import React, { useCallback, useEffect, useState } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useAuth } from '@/lib/auth';

function getApiBase() {
  return process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : '';
}

interface NotificationItem {
  id: string;
  readAt: string | null;
  createdAt: string;
  announcement: {
    id: string;
    venueId: string;
    venueName: string;
    title: string;
    body: string;
    type: string;
    createdAt: string;
  };
}

const TYPE_LABELS: Record<string, string> = {
  closed: 'Closed today',
  special: 'Daily special',
  general: 'Update',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated, login } = useAuth();
  const { bottomTabPadding, horizontalPadding, topInset } = useResponsiveLayout();

  const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
    closed:  { label: TYPE_LABELS.closed,  color: colors.destructive },
    special: { label: TYPE_LABELS.special, color: colors.accent },
    general: { label: TYPE_LABELS.general, color: colors.primary },
  };

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) { setNotifications([]); return; }
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('auth_session_token');
      const apiBase = getApiBase();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${apiBase}/api/notifications`, { headers });
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const markRead = async (ids?: string[]) => {
    try {
      const token = await SecureStore.getItemAsync('auth_session_token');
      const apiBase = getApiBase();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`${apiBase}/api/notifications/read`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ids: ids ?? [] }),
      });
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) =>
          !ids || ids.length === 0 || ids.includes(n.id)
            ? { ...n, readAt: now }
            : n,
        ),
      );
    } catch {
      // ignore
    }
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  if (!isAuthenticated) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: topInset, paddingBottom: bottomTabPadding }]}>
        <Ionicons name="notifications-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Notifications</Text>
        <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
          Log in to see announcements from venues you follow.
        </Text>
        <Pressable
          style={[styles.loginBtn, { backgroundColor: colors.primary }]}
          onPress={login}
        >
          <Text style={[styles.loginBtnText, { color: colors.primaryForeground }]}>
            Log in
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            paddingTop: topInset + 10,
            paddingHorizontal: horizontalPadding,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text>
        {unreadCount > 0 && (
          <Pressable onPress={() => markRead()}>
            <Text style={[styles.markAllRead, { color: colors.primary }]}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="notifications-off-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No notifications</Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            Follow venues you love to see their announcements here.
          </Text>
          <Pressable
            style={[styles.loginBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
            onPress={() => router.push('/explore')}
          >
            <Text style={[styles.loginBtnText, { color: colors.foreground }]}>
              Explore venues
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: bottomTabPadding }}>
          {notifications.map((n) => {
            const isUnread = !n.readAt;
            const typeConf = TYPE_CONFIG[n.announcement.type] ?? TYPE_CONFIG.general;
            return (
              <Pressable
                key={n.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: isUnread ? colors.card : colors.background,
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={() => {
                  if (isUnread) markRead([n.id]);
                  router.push(`/listing/${n.announcement.venueId}`);
                }}
              >
                <View style={styles.cardTop}>
                  <Text style={[styles.venueName, { color: colors.foreground }]}>
                    {n.announcement.venueName}
                  </Text>
                  <View style={[styles.typeBadge, { backgroundColor: typeConf.color + '22' }]}>
                    <Text style={[styles.typeBadgeText, { color: typeConf.color }]}>
                      {typeConf.label}
                    </Text>
                  </View>
                  {isUnread && (
                    <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                  )}
                </View>
                <Text style={[styles.announcementTitle, { color: colors.foreground }]}>
                  {n.announcement.title}
                </Text>
                <Text
                  style={[styles.announcementBody, { color: colors.mutedForeground }]}
                  numberOfLines={3}
                >
                  {n.announcement.body}
                </Text>
                <Text style={[styles.timeAgo, { color: colors.mutedForeground }]}>
                  {timeAgo(n.announcement.createdAt)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  markAllRead: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  emptyBody: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', maxWidth: 260 },
  loginBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  loginBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  card: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  venueName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  typeBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  announcementTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', lineHeight: 20 },
  announcementBody: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  timeAgo: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
});
