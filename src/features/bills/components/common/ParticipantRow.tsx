import { memo } from 'react';
import { Image, Text, TextInput, View } from 'react-native';

import { labelFor, toNum } from '@/features/bills/utils';
import { useTheme } from '@/theme/hooks/useTheme';
import type { SplitMethod } from '@/types';

function Avatar({
  uri,
  name,
  size = 40,
}: {
  uri?: string | null;
  name?: string | null;
  size?: number;
}) {
  const initials = (() => {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  })();

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  if (uri) {
    return <Image source={{ uri }} style={avatarStyle as any} />;
  }

  // fallback initials circle
  return (
    <View
      style={{
        ...avatarStyle,
        backgroundColor: '#E5E7EB', // light gray fallback (tailwind gray-200)
      }}>
      <Text style={{ fontWeight: '600', color: '#111827' /* gray-900 */ }}>{initials}</Text>
    </View>
  );
}

function ParticipantRow({
  id,
  displayName,
  avatarUrl,
  phone,
  mode,
  amount,
  equalPerPerson,
  percentStr = '',
  exactStr = '',
  shareStr = '',
  totalShares = 0,
  onChangeExact,
  onChangePercent,
  onChangeShare,
}: {
  id: string;
  displayName?: string; // prefer this over labelFor(id)
  avatarUrl?: string | null;
  phone?: string | null;
  mode: SplitMethod;
  amount: number;
  equalPerPerson: number;
  percentStr?: string;
  exactStr?: string;
  shareStr?: string;
  totalShares?: number;
  onChangeExact: (id: string, v: string) => void;
  onChangePercent: (id: string, v: string) => void;
  onChangeShare: (id: string, v: string) => void;
}) {
  const { theme } = useTheme();
  const pct = toNum(percentStr || '0');
  const shares = toNum(shareStr || '0');
  const amountFromPct = amount * (pct / 100);
  const amountFromShare = totalShares > 0 ? (amount * shares) / totalShares : 0;

  const inputCls = 'h-11 px-3 rounded-xl border text-base';
  const inputStyles = {
    color: theme.colors.textPrimary,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.inputBackground,
  };

  // prefer displayName if provided, otherwise fallback to labelFor(id)
  const label = displayName ?? labelFor(id);

  // subtle phone line, shown only when available
  const phoneLine = phone ? String(phone) : null;

  return (
    <View
      style={{ borderColor: theme.colors.border }}
      className="flex-row items-center border-b py-3">
      {/* Left: avatar + name / phone */}
      <View className="flex-row items-center pr-3" style={{ width: 160 }}>
        <View className="pr-3">
          <Avatar uri={avatarUrl} name={label} size={40} />
        </View>

        <View className="flex-1">
          <Text style={{ color: theme.colors.textPrimary }} className="text-sm font-medium">
            {label}
          </Text>
          {phoneLine ? (
            <Text style={{ color: theme.colors.textSecondary }} className="text-xs">
              {phoneLine}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Right: mode-specific inputs and amount */}
      {mode === 'equal' && (
        <Text
          style={{ color: theme.colors.textPrimary }}
          className="flex-1 text-right font-semibold">
          ₹{(equalPerPerson || 0).toFixed(2)}
        </Text>
      )}

      {mode === 'exact' && (
        <>
          <View className="flex-1 pr-3">
            <View className={inputCls} style={inputStyles}>
              <View className="absolute left-3 top-2.5">
                <Text style={{ color: theme.colors.textSecondary }}>₹</Text>
              </View>
              <TextInput
                value={exactStr}
                onChangeText={(t) => onChangeExact(id, t)}
                keyboardType="numeric"
                placeholder={equalPerPerson ? equalPerPerson.toFixed(2) : '0.00'}
                className="h-11 pl-6 pr-2 text-right"
              />
            </View>
          </View>
          <Text style={{ color: theme.colors.textPrimary }} className="w-24 text-right">
            ₹{toNum(exactStr || '0').toFixed(2)}
          </Text>
        </>
      )}

      {mode === 'percent' && (
        <>
          <View className="flex-1 pr-3">
            <View className={inputCls} style={inputStyles}>
              <TextInput
                value={percentStr}
                onChangeText={(t) => onChangePercent(id, t)}
                keyboardType="numeric"
                placeholder={(100).toFixed(0)}
                className="h-11 px-2 pr-4 text-right"
              />
              <View className="absolute right-3 top-2.5">
                <Text style={{ color: theme.colors.textSecondary }}>%</Text>
              </View>
            </View>
          </View>
          <Text style={{ color: theme.colors.textPrimary }} className="w-24 text-right">
            ₹{amountFromPct.toFixed(2)}
          </Text>
        </>
      )}

      {mode === 'shares' && (
        <>
          <View className="flex-1 pr-3">
            <View className={inputCls} style={inputStyles}>
              <TextInput
                value={shareStr}
                onChangeText={(t) => onChangeShare(id, t)}
                keyboardType="numeric"
                placeholder="1"
                className="h-11 px-2 pr-5 text-right"
              />
              <View className="absolute right-3 top-2.5">
                <Text style={{ color: theme.colors.textSecondary }}>sh</Text>
              </View>
            </View>
          </View>
          <Text style={{ color: theme.colors.textPrimary }} className="w-24 text-right">
            ₹{amountFromShare.toFixed(2)}
          </Text>
        </>
      )}
    </View>
  );
}

export default memo(ParticipantRow);
