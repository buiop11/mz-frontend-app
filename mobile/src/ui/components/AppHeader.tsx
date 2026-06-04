import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useTokens } from '@/src/ui/tokens';

type Props = Readonly<{
  title?: string;
  leftIconName?: React.ComponentProps<typeof Feather>['name'];
  onPressLeft?: () => void;
  rightIconName?: React.ComponentProps<typeof Feather>['name'];
  onPressRight?: () => void;
}>;

export function AppHeader({ title, leftIconName, onPressLeft, rightIconName, onPressRight }: Props) {
  const t = useTokens();

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background, borderBottomColor: t.colors.border }]}>
      <View style={styles.side}>
        {leftIconName ? (
          <Pressable onPress={onPressLeft} hitSlop={10} style={styles.iconBtn}>
            <Feather name={leftIconName} size={22} color={t.colors.text} />
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      <Text style={[styles.title, { color: t.colors.gold }]} numberOfLines={1}>
        {title ?? ''}
      </Text>

      <View style={styles.side}>
        {rightIconName ? (
          <Pressable onPress={onPressRight} hitSlop={10} style={[styles.iconBtn, { alignSelf: 'flex-end' }]}>
            <Feather name={rightIconName} size={20} color={t.colors.text} />
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: { width: 44 },
  placeholder: { width: 44, height: 44 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
});

