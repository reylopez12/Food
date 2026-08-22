import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { CATEGORIES } from '@/constants/data';
import { useDirectory } from '@/context/DirectoryContext';
import * as Haptics from 'expo-haptics';

export function CategoryPillRow() {
  const colors = useColors();
  const { selectedCategory, setSelectedCategory } = useDirectory();

  const handleSelect = (id: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setSelectedCategory(id);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CATEGORIES.map((cat) => {
        const active = selectedCategory === cat.id;
        return (
          <Pressable
            key={cat.id}
            onPress={() => handleSelect(cat.id)}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: active ? colors.primary : colors.card,
                borderColor: active ? colors.primary : colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather
              name={cat.icon as any}
              size={16}
              color={active ? colors.primaryForeground : colors.mutedForeground}
            />
            <Text
              style={[
                styles.label,
                { color: active ? colors.primaryForeground : colors.foreground },
              ]}
            >
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
