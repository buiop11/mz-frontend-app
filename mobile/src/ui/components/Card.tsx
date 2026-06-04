import { StyleSheet, ViewStyle } from 'react-native';

import { View } from '@/components/Themed';
import { useTokens } from '@/src/ui/tokens';

type Props = Readonly<{
  children: React.ReactNode;
  style?: ViewStyle;
  background?: 'surface' | 'muted';
  border?: boolean;
  radius?: number;
  padding?: number;
}>;

export function Card({ children, style, background = 'surface', border = false, radius, padding }: Props) {
  const t = useTokens();
  const bg = background === 'muted' ? t.colors.muted : t.colors.surface;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: bg,
          borderRadius: radius ?? t.radius.lg,
          padding: padding ?? t.spacing.lg,
          borderColor: t.colors.border,
          borderWidth: border ? StyleSheet.hairlineWidth : 0,
          shadowColor: '#000000',
          shadowOpacity: 0.24,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
});

