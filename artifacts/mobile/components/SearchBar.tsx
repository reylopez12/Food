import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { SearchMode } from '@/context/DirectoryContext';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onClear?: () => void;
  editable?: boolean;
  mode?: SearchMode;
  onModeChange?: (mode: SearchMode) => void;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search listings...',
  autoFocus = false,
  onClear,
  editable = true,
  mode,
  onModeChange,
}: SearchBarProps) {
  const colors = useColors();
  const [modeMenuOpen, setModeMenuOpen] = React.useState(false);
  const modeOptions: Array<{ value: SearchMode; label: string }> = [
    { value: 'food', label: 'Food' },
    { value: 'city', label: 'City' },
    { value: 'neighborhood', label: 'Neighborhood' },
    { value: 'near-me', label: 'Near me' },
  ];
  const selectedMode = modeOptions.find((option) => option.value === mode);

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {mode && onModeChange ? (
          <>
            <Pressable
              onPress={() => setModeMenuOpen(true)}
              style={styles.modeTrigger}
              accessibilityRole="button"
              accessibilityLabel="Choose what to search"
            >
              <Text style={[styles.modeTriggerText, { color: colors.foreground }]}>
                {selectedMode?.label}
              </Text>
              <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
            </Pressable>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </>
        ) : null}
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          autoFocus={autoFocus}
          editable={editable}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {value.length > 0 && (
          <Pressable
            onPress={onClear ?? (() => onChangeText(''))}
            hitSlop={8}
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>
      {mode && onModeChange ? (
        <Modal
          visible={modeMenuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setModeMenuOpen(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setModeMenuOpen(false)}>
            <View style={[styles.modeMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.modeMenuTitle, { color: colors.mutedForeground }]}>
                Search for
              </Text>
              {modeOptions.map((option) => {
                const active = option.value === mode;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onModeChange(option.value);
                      setModeMenuOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.modeOption,
                      { backgroundColor: active ? colors.primary + '18' : 'transparent', opacity: pressed ? 0.7 : 1 },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.modeOptionText, { color: active ? colors.primary : colors.foreground }]}>
                      {option.label}
                    </Text>
                    {active ? <Feather name="check" size={17} color={colors.primary} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
  },
  modeTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  modeTriggerText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    marginHorizontal: 2,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    padding: 0,
  },
  clearButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -5,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.38)',
    padding: 16,
  },
  modeMenu: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 8,
    marginBottom: 12,
  },
  modeMenuTitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  modeOption: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeOptionText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
