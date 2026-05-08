import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export function useTokens() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return {
    colors: c,
    radius: {
      sm: 10,
      md: 12,
      lg: 16,
      xl: 20,
      pill: 999,
    },
    spacing: {
      xs: 6,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
    },
  };
}

