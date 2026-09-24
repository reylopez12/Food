import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const WEB_STATUS_INSET = 67;
const WEB_TAB_BAR_HEIGHT = 124;
const NATIVE_TAB_BAR_HEIGHT = 120;

export function useResponsiveLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const horizontalPadding = isCompact ? 16 : 20;

  return {
    width,
    isCompact,
    horizontalPadding,
    topInset: Platform.OS === 'web' ? WEB_STATUS_INSET : insets.top,
    bottomTabPadding:
      Platform.OS === 'web'
        ? WEB_TAB_BAR_HEIGHT + 20
        : NATIVE_TAB_BAR_HEIGHT + Math.max(insets.bottom, 16) + 16,
  };
}