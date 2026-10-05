import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../firebase/context/ThemeContext';

const Icon = ({ name, size = 24, color = '#000' }) => {
  let path = '';
  if (name === 'call-outline') path = 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.79 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z';
  if (name === 'chevron-back-outline') path = 'M15 19l-7-7 7-7';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d={path} />
    </Svg>
  );
};

export default function CallsScreen({ navigation }) {
  const { colors } = useTheme();
  const bg = colors?.background || '#ffffff';
  const text = colors?.text || '#111111';
  const secondary = colors?.rowTime || '#888888';
  const primary = colors?.primary || '#1a4b8c';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={[styles.header, { borderBottomColor: colors?.border || '#e5e5e5' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="chevron-back-outline" size={26} color={text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: text }]}>Calls</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.empty}>
        <View style={[styles.iconCircle, { backgroundColor: primary + '15' }]}>
          <Icon name="call-outline" size={56} color={primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: text }]}>No calls yet</Text>
        <Text style={[styles.emptySubtitle, { color: secondary }]}>
          Your call history will appear here
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, width: 40 },
  title: { fontSize: 18, fontWeight: '700' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  iconCircle: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
});
