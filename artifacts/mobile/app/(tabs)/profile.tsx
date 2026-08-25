import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useDirectory } from '@/context/DirectoryContext';
import { CATEGORIES } from '@/constants/data';
import { useAuth } from '@/lib/auth';

interface SettingRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

function SettingRow({ icon, label, value, onPress, rightElement }: SettingRowProps) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingRow,
        { backgroundColor: colors.card, opacity: pressed && !!onPress ? 0.85 : 1 },
      ]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
        <Feather name={icon as any} size={16} color={colors.primary} />
      </View>
      <Text style={[styles.settingLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={styles.settingRight}>
        {value ? (
          <Text style={[styles.settingValue, { color: colors.mutedForeground }]} numberOfLines={1}>{value}</Text>
        ) : null}
        {rightElement ?? null}
        {onPress && !rightElement && (
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        )}
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const { bottomTabPadding, horizontalPadding, topInset } = useResponsiveLayout();
  const { listings, savedListings } = useDirectory();
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const industry = 'General Business';

  const stats = [
    { label: 'Total Listings', value: listings.length.toString() },
    { label: 'Saved', value: savedListings.length.toString() },
    { label: 'Categories', value: (CATEGORIES.length - 1).toString() },
  ];

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'User'
    : null;
  const displayEmail = user?.email ?? null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomTabPadding }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topInset + 12, paddingHorizontal: horizontalPadding }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        </View>

        {/* Avatar + name */}
        {isAuthenticated ? (
          <View style={[styles.profileCard, { backgroundColor: colors.card, marginHorizontal: horizontalPadding - 4 }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Ionicons name="person" size={32} color={colors.primaryForeground} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.foreground }]}>
                {displayName}
              </Text>
              {displayEmail ? (
                <Text style={[styles.profileEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {displayEmail}
                </Text>
              ) : null}
            </View>
            <Pressable
              style={[styles.editBtn, { borderColor: colors.border }]}
              onPress={() =>
                Alert.alert('Sign out', 'Are you sure you want to sign out?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign out', style: 'destructive', onPress: logout },
                ])
              }
            >
              <Feather name="log-out" size={16} color={colors.foreground} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.profileCard, { backgroundColor: colors.card, marginHorizontal: horizontalPadding - 4 }]}
            onPress={login}
            disabled={isLoading}
          >
            <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
              <Ionicons name="person-outline" size={32} color={colors.mutedForeground} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.foreground }]}>Sign in</Text>
              <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>
                Tap to log in to your account
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          {stats.map((stat) => (
          <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Template info */}
        <View style={[styles.templateBanner, { backgroundColor: colors.secondary, borderColor: colors.primary, marginHorizontal: horizontalPadding - 4 }]}>
          <Ionicons name="layers-outline" size={18} color={colors.primary} />
          <View style={styles.templateText}>
            <Text style={[styles.templateTitle, { color: colors.primary }]}>Directory Template</Text>
            <Text style={[styles.templateSub, { color: colors.mutedForeground }]}>
              Currently configured for: {industry}
            </Text>
          </View>
        </View>

        {/* Preferences */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Preferences</Text>
        <View style={[styles.section, { backgroundColor: colors.card, marginHorizontal: horizontalPadding - 4 }]}>
          <SettingRow
            icon="bell"
            label="Notifications"
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#fff"
              />
            }
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="map-pin"
            label="Default Location"
            value="San Francisco, CA"
            onPress={() => Alert.alert('Coming soon', 'Location settings will be available soon.')}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="sliders"
            label="Industry"
            value={industry}
            onPress={() => Alert.alert('Template', 'Customize this for your industry.')}
          />
        </View>

        {/* Support */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Support</Text>
        <View style={[styles.section, { backgroundColor: colors.card, marginHorizontal: horizontalPadding - 4 }]}>
          <SettingRow
            icon="star"
            label="Rate the App"
            onPress={() => Alert.alert('Thank you!', 'Your feedback helps us improve.')}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="help-circle"
            label="Help & FAQ"
            onPress={() => Alert.alert('Help', 'Visit our support center for help.')}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="info"
            label="About"
            value="v1.0.0"
            onPress={() => Alert.alert('Directory App', 'A versatile directory template.')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: { flex: 1, minWidth: 0 },
  profileName: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    textAlign: 'center',
  },
  templateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  templateText: { flex: 1 },
  templateTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  templateSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 8,
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  settingValue: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    flexShrink: 1,
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 58,
  },
});
