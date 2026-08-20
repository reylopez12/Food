import React, { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/lib/auth';

// ─── Unread count (same pattern as _layout.tsx) ───────────────────────────────

function getApiBase() {
  return process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : '';
}

function useUnreadCount(isAuthenticated: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isAuthenticated) { setCount(0); return; }
    let cancelled = false;
    const fetch_ = async () => {
      try {
        const token = await SecureStore.getItemAsync('auth_session_token');
        if (!token || cancelled) return;
        const res = await fetch(`${getApiBase()}/api/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setCount(data.count ?? 0);
        }
      } catch {}
    };
    fetch_();
    const id = setInterval(fetch_, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [isAuthenticated]);
  return count;
}

// ─── Menu row ─────────────────────────────────────────────────────────────────

interface MenuItem {
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  route: string;
  badge?: number;
}

function MenuRow({
  item,
  onPress,
  colors,
}: {
  item: MenuItem;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={item.icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.foreground }]}>{item.label}</Text>
      {!!item.badge && item.badge > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
          <Text style={[styles.badgeText, { color: colors.destructiveForeground }]}>
            {item.badge > 99 ? '99+' : String(item.badge)}
          </Text>
        </View>
      )}
      <Feather
        name="chevron-right"
        size={16}
        color={colors.mutedForeground}
        style={styles.chevron}
      />
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated, login, logout } = useAuth();
  const unreadCount = useUnreadCount(isAuthenticated);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 120 : insets.bottom + 100;

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Account'
    : null;

  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName ? user.lastName[0] : ''}`.toUpperCase()
    : '?';

  const menuItems: MenuItem[] = [
    { label: 'Saved',         icon: 'bookmark', route: '/saved' },
    { label: 'Profile',       icon: 'user',     route: '/profile' },
    { label: 'Notifications', icon: 'bell',     route: '/notifications', badge: unreadCount },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 14, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>More</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Profile / sign-in card ── */}
        {isAuthenticated && user ? (
          <Pressable
            onPress={() => router.push('/profile')}
            style={({ pressed }) => [
              styles.profileCard,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileText}>
              <Text style={[styles.profileName, { color: colors.foreground }]} numberOfLines={1}>
                {displayName}
              </Text>
              {user.email ? (
                <Text style={[styles.profileEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {user.email}
                </Text>
              ) : null}
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        ) : (
          <Pressable
            onPress={login}
            style={({ pressed }) => [
              styles.profileCard,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
              <Feather name="user" size={20} color={colors.mutedForeground} />
            </View>
            <View style={styles.profileText}>
              <Text style={[styles.profileName, { color: colors.foreground }]}>Sign in</Text>
              <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>
                Tap to log in to your account
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}

        {/* ── Menu rows ── */}
        <View style={[styles.section, { borderColor: colors.border }]}>
          {menuItems.map((item, idx) => (
            <React.Fragment key={item.route}>
              <MenuRow
                item={item}
                onPress={() => router.push(item.route as never)}
                colors={colors}
              />
              {idx < menuItems.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* ── Sign out ── */}
        {isAuthenticated && (
          <Pressable
            onPress={logout}
            style={({ pressed }) => [
              styles.signOutBtn,
              { borderColor: colors.border, opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <Feather name="log-out" size={16} color={colors.destructive} />
            <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign out</Text>
          </Pressable>
        )}

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:  { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 34,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  scroll: {
    paddingTop: 24,
    paddingHorizontal: 16,
    gap: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  profileText: { flex: 1 },
  profileName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  section: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  chevron: { marginLeft: 'auto' as never },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 66,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
});
