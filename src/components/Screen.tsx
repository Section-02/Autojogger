import { PropsWithChildren } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export function Screen({ children }: PropsWithChildren) {
  return <SafeAreaView style={styles.safe}><View style={styles.container}>{children}</View></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, container: { flex: 1, paddingHorizontal: 20 } });
