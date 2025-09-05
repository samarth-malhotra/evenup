// ProfileScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { Platform, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

import AppHeader from '@/lib/shared/components/AppHeader';

export default function Profile() {
  const navigation = useNavigation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [currency, setCurrency] = useState<'INR' | 'USD' | 'EUR'>('INR');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title="Profile" showBackButton={false} />,
    });
  }, [navigation]);

  // Mock handlers
  const onEditProfile = () => {};
  const onPaymentMethods = () => {};
  const onChangeCurrency = () => {
    // cycle through to show UI working
    setCurrency((c) => (c === 'INR' ? 'USD' : c === 'USD' ? 'EUR' : 'INR'));
  };
  const onExportData = () => {};

  return (
    <View className="flex-1 px-4">
      {/* User card */}
      <View style={[styles.userCard, styles.shadow]}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={48} color="#6C5CE7" />
          </View>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.userName}>Juhi</Text>
          <Text style={styles.userPhone}>+91 98765 43210</Text>
        </View>
      </View>

      {/* Account */}
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={[styles.card, styles.shadow]}>
        <Row
          icon="create-outline"
          iconTint="#6C5CE7"
          label="Edit Profile"
          onPress={onEditProfile}
        />
        <Divider />
        <Row
          icon="card-outline"
          iconTint="#6C5CE7"
          label="Payment Methods"
          onPress={onPaymentMethods}
        />
      </View>

      {/* Preferences */}
      <Text style={styles.sectionTitle}>Preferences</Text>
      <View style={[styles.card, styles.shadow]}>
        <RowSwitch
          icon="notifications-outline"
          iconTint="#6C5CE7"
          label="Notifications"
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
        />
        <Divider />
        <RowValue
          icon="sync-outline"
          iconTint="#6C5CE7"
          label="Currency"
          value={`₹ ${currency}`}
          onPress={onChangeCurrency}
        />
        <Divider />
        <RowValue
          icon="moon-outline"
          iconTint="#6C5CE7"
          label="Dark Mode"
          value={darkModeEnabled ? 'On' : 'Off'}
          onPress={() => setDarkModeEnabled((v) => !v)}
        />
      </View>

      {/* Data & Security */}
      <Text style={styles.sectionTitle}>Data & Security</Text>
      <View style={[styles.card, styles.shadow]}>
        <Row
          icon="cloud-download-outline"
          iconTint="#6C5CE7"
          label="Export Data"
          onPress={onExportData}
        />
      </View>

      {/* <View style={{ height: 24 }} /> */}
    </View>
  );
}

/* ----------------------------- Reusable rows ------------------------------ */

function Row({
  icon,
  iconTint = '#6C5CE7',
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconTint?: string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      <LeadingIcon name={icon} color={iconTint} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

function RowSwitch({
  icon,
  iconTint = '#6C5CE7',
  label,
  value,
  onValueChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconTint?: string;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <LeadingIcon name={icon} color={iconTint} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? '#fff' : undefined}
        trackColor={{ false: '#E5E7EB', true: '#6C5CE7' }}
      />
    </View>
  );
}

function RowValue({
  icon,
  iconTint = '#6C5CE7',
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconTint?: string;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      <LeadingIcon name={icon} color={iconTint} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.valueText}>{value}</Text>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

function LeadingIcon({ name, color }: { name: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <View style={styles.leadingIcon}>
      <Ionicons name={name} size={18} color={color} />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

/* --------------------------------- Styles -------------------------------- */

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#F6F4FF',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },

  /* User card */
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  avatarWrap: { alignItems: 'center', marginBottom: 8 },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EFEAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 4,
  },
  userPhone: { fontSize: 15, color: '#6B7280', marginTop: 4 },

  /* Sections */
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginTop: 10,
    marginBottom: 10,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  leadingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F2F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 17,
    color: '#111827',
    fontWeight: '700',
  },
  valueText: {
    fontSize: 15,
    color: '#6B7280',
    marginRight: 6,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#EFEAFB',
  },

  /* Soft shadow like iOS cards */
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});
