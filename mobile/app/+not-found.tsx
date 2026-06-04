import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useTokens } from '@/src/ui/tokens';

export default function NotFoundScreen() {
  const t = useTokens();

  return (
    <>
      <Stack.Screen options={{ title: '화면 없음' }} />
      <View style={[styles.container, { backgroundColor: t.colors.background }]}>
        <Text style={[styles.title, { color: t.colors.text }]}>요청한 화면을 찾을 수 없어요.</Text>

        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: t.colors.gold }]}>홈으로 돌아가기</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: '#2e78b7',
  },
});
