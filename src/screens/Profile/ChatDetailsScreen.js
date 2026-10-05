import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../firebase/context/ThemeContext';
import { useUserProfiles, getDisplayName } from '../../services/userService';

const Icon = ({ name, size = 24, color = '#000' }) => {
  let path = '';
  if (name === 'chevron-back-outline') path = 'M15 19l-7-7 7-7';
  if (name === 'people-outline') path = 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0-4-4 4 4 0 0 0 4 4z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75';
  if (name === 'mail-outline') path = 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d={path} />
    </Svg>
  );
};

export default function ChatDetailsScreen({ route, navigation }) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const { contactName, groupDetails, otherUser } = route.params;

  const participantUids = groupDetails?.participants || [];
  const userProfiles = useUserProfiles(participantUids);

  const bgColor = colors.background;
  const textColor = colors.text;
  const secondaryText = colors.rowTime;
  const cardColor = colors.rowBg;
  const borderColor = colors.border;
  const brandColor = colors.primary;

  const renderMemberItem = (uid) => {
    const profile = userProfiles[uid];
    const name = getDisplayName(userProfiles, uid);
    const isAdmin = groupDetails?.admins?.includes(uid);

    return (
      <View key={uid} style={[styles.memberRow, { borderBottomColor: borderColor }]}>
        <View style={[styles.memberAvatar, { backgroundColor: brandColor + '20' }]}>
          {profile?.photoURL ? (
            <Image source={{ uri: profile.photoURL }} style={styles.avatarImg} />
          ) : (
            <Text style={[styles.avatarText, { color: brandColor }]}>{name.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: textColor }]}>{name}</Text>
          {isAdmin && <Text style={[styles.adminBadge, { color: brandColor }]}>Admin</Text>}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Icon name="chevron-back-outline" size={28} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <View style={[styles.largeAvatar, { borderColor: brandColor }]}>
            {(groupDetails?.groupPhotoUrl || otherUser?.photoURL) ? (
              <Image
                source={{ uri: groupDetails?.groupPhotoUrl || otherUser?.photoURL }}
                style={styles.avatarImg}
              />
            ) : (
              <Text style={[styles.largeAvatarText, { color: brandColor }]}>
                {contactName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={[styles.name, { color: textColor }]}>{contactName}</Text>
          <Text style={[styles.status, { color: secondaryText }]}>
            {groupDetails ? 'Group Chat' : 'Direct Chat'}
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: cardColor, borderColor: borderColor }]}>
          <Text style={[styles.sectionTitle, { color: brandColor }]}>About</Text>
          <Text style={[styles.description, { color: textColor }]}>
            {groupDetails?.description || otherUser?.bio || 'No description provided.'}
          </Text>

          {groupDetails?.department && (
            <View style={styles.detailRow}>
              <Icon name="people-outline" size={18} color={secondaryText} />
              <Text style={[styles.detailText, { color: secondaryText }]}>
                Department: {groupDetails.department}
              </Text>
            </View>
          )}

          {otherUser?.email && (
            <View style={styles.detailRow}>
              <Icon name="mail-outline" size={18} color={secondaryText} />
              <Text style={[styles.detailText, { color: secondaryText }]}>
                {otherUser.email}
              </Text>
            </View>
          )}
        </View>

        {groupDetails && (
          <View style={styles.membersSection}>
            <Text style={[styles.sectionTitle, { color: brandColor, marginLeft: 20, marginBottom: 10 }]}>
              Members ({participantUids.length})
            </Text>
            <View style={[styles.membersCard, { backgroundColor: cardColor, borderColor: borderColor }]}>
              {participantUids.map(uid => renderMemberItem(uid))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    height: 60,
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 40 },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  largeAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
    marginBottom: 15,
  },
  largeAvatarText: { fontSize: 40, fontWeight: 'bold' },
  avatarImg: { width: '100%', height: '100%' },
  name: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  status: { fontSize: 14 },
  section: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 1 },
  description: { fontSize: 15, lineHeight: 22, marginBottom: 15 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  detailText: { fontSize: 14, marginLeft: 10 },
  membersSection: { marginTop: 10 },
  membersCard: {
    marginHorizontal: 20,
    borderRadius: 15,
    borderWidth: 1,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  avatarText: { fontSize: 16, fontWeight: 'bold' },
  memberInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberName: { fontSize: 16, fontWeight: '500' },
  adminBadge: { fontSize: 12, fontWeight: 'bold' },
});
