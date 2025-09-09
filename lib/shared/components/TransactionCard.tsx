import React from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Avatar } from './Avatar';

/**
 * Single-file reusable TransactionCard + demo of many variations.
 * - Uses Tailwind classes (NativeWind) if available.
 * - Adds explicit shadow styles (shadowCard) for stronger elevation.
 *
 * Replace any string types with your EvenUp types imports where needed.
 */

/* ----------------------------- Utilities ------------------------------ */
export type TransactionStatus =
  | 'you-owe'
  | 'friend-owe'
  //   | 'you-borrowed'
  | 'settle'
  | 'settled'
  | 'pending'
  | 'error';

interface BadgeItem {
  title: string;
  amount: number | string;
  status: 'you-owe' | 'friend-owe';
}

interface TransactionCardProps {
  title: string;
  subtitle?: string;
  avatarInitials?: string;
  img?: string;
  amount?: number | string;
  status?: TransactionStatus;
  badges?: BadgeItem[];
  compact?: boolean;
  isNew?: boolean;
  disabled?: boolean;
  hasAttachment?: boolean;
  icon?: React.ReactNode;
  noShadow?: boolean;
  errorMessage?: string;
  onPress?: () => void;
  onSettle?: () => void;
  onRetry?: () => void;
  className?: string;
}

/* --------------------------- Styles (shadow) -------------------------- */
const shadowCard = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
  },
  android: {
    elevation: 6,
  },
  default: {},
});

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 14,
    marginBottom: 12,
  },
  shadow: {
    // merge in platform shadows
    ...shadowCard,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 18,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  amount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  pillBase: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignSelf: 'flex-end',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  badgesWrap: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badgeItem: {
    // backgroundColor: '#ECFDF5',
    // borderRadius: 999,
    marginRight: 8,
    // marginTop: 6,
    // color: 'red',
  },
  badgeText: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    // color: '#065F46',
    fontWeight: '600',
    fontSize: 12,
    color: 'inherit',
  },
});

/* --------------------------- Small Subcomponents --------------------------- */

const AvatarCircle: React.FC<{ name: string; img?: string; icon: React.ReactNode }> = ({
  name,
  img,
  icon,
}) => {
  return (
    <View style={styles.avatar}>
      {icon ? (
        icon
      ) : img ? (
        <Image source={{ uri: img }} className="h-full w-full rounded-full" />
      ) : (
        <Avatar name={name} />
      )}
    </View>
  );
};

const StatusPill: React.FC<{
  status?: TransactionStatus;
  label?: string;
  onPress?: () => void;
  prominent?: boolean;
}> = ({ status = 'neutral', label, onPress, prominent = false }) => {
  let bg = '#F3F4F6';
  let text = '#374151';
  let borderColor: string | undefined;
  let isButton = false;

  switch (status) {
    case 'you-owe':
      bg = '#FEF2F2';
      text = '#DC2626';
      break;
    case 'friend-owe':
      bg = '#ECFDF5';
      text = '#059669';
      break;
    // case 'you-borrowed':
    //   bg = '#FFFAEB';
    //   text = '#B45309';
    //   break;
    case 'settle':
      bg = '#059669';
      text = '#FFFFFF';
      isButton = true;
      break;
    case 'pending':
      bg = '#FEF3C7';
      text = '#92400E';
      break;
    case 'error':
      bg = '#FCE7F3';
      text = '#BE185D';
      borderColor = '#FBCFE8';
      break;
    default:
      bg = '#F3F4F6';
      text = '#374151';
  }

  const pill = (
    <View
      style={[
        styles.pillBase,
        {
          backgroundColor: bg,
          borderColor: borderColor ?? 'transparent',
          borderWidth: borderColor ? 1 : 0,
        },
      ]}>
      <Text style={[styles.pillText, { color: text }]}>{label}</Text>
    </View>
  );

  if (isButton || onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8} style={{ marginTop: 6 }}>
        {pill}
      </Pressable>
    );
  }

  return <View style={{ marginTop: 6 }}>{pill}</View>;
};

const BadgesRow: React.FC<{ badges?: BadgeItem[] }> = ({ badges }) => {
  const getBadgeTheme = (status: string) => {
    if (status === 'you-owe') {
      return { backgroundColor: '#FEF2F2', color: '#DC2626' };
    } else if (status === 'friend-owe') {
      return { backgroundColor: '#ECFDF5', color: '#059669' };
    } else {
      return { backgroundColor: '#F3F4F6', color: '#374151' };
    }
  };

  if (!badges?.length) return null;
  return (
    <View style={styles.badgesWrap as any}>
      {badges.map((b, i) => (
        <View key={i} style={(styles.badgeItem, { ...getBadgeTheme(b.status) })}>
          <Text style={styles.badgeText}>
            {b.title}
            {b.amount !== undefined ? ` · ₹${b.amount}` : ''}
          </Text>
        </View>
      ))}
    </View>
  );
};

/* --------------------------- TransactionCard --------------------------- */

const TransactionCard: React.FC<TransactionCardProps> = ({
  title,
  subtitle,
  avatarInitials,
  img,
  amount,
  status,
  badges,
  compact,
  isNew,
  disabled,
  hasAttachment,
  errorMessage,
  icon,
  noShadow = false,
  className,
  onPress,
  onSettle,
  onRetry,
}) => {
  const label =
    status === 'you-owe'
      ? 'You owe'
      : status === 'friend-owe'
        ? 'Owes you'
        : status === 'settle'
          ? 'Settle'
          : status === 'pending'
            ? 'Pending'
            : status === 'error'
              ? 'Failed'
              : status === 'settled'
                ? 'Settled'
                : '';

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onPress}
      disabled={!!disabled}
      className={`${className}`}
      style={[
        styles.cardContainer,
        !noShadow ? styles.shadow : undefined,
        compact ? { paddingVertical: 10, paddingHorizontal: 12 } : undefined,
      ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <AvatarCircle name={title} img={img} icon={icon} />

        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.title}>
                {title}
                {isNew ? ' · New' : ''}
              </Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              {/* Multi badges (for rollup) */}
              <BadgesRow badges={badges} />
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              {amount !== undefined ? <Text style={styles.amount}>₹{amount}</Text> : null}

              {/* status or settle button */}
              {status === 'settle' ? (
                <StatusPill
                  status="settle"
                  label={label || 'Settle'}
                  onPress={onSettle}
                  prominent
                />
              ) : status === 'error' && onRetry ? (
                <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
                  <StatusPill status="error" label="Failed" />
                  <Pressable onPress={onRetry} style={{ marginLeft: 8, padding: 8 }}>
                    <Text style={{ color: '#0B74FF', fontWeight: '700' }}>Retry</Text>
                  </Pressable>
                </View>
              ) : (
                status && <StatusPill status={status} label={label || ''} />
              )}
            </View>
          </View>

          {/* attachments / extra meta */}
          {hasAttachment ? (
            <View style={{ marginTop: 10 }}>
              <Text style={{ color: '#6B7280', fontSize: 13 }}>
                Receipt attached • tap to preview
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default TransactionCard;
