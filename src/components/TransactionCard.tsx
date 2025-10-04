import React from 'react';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { getBoxShadow } from '@/theme/hooks/getBoxShadow';
import { useColor } from '@/theme/hooks/useColor';
import { useTheme } from '@/theme/hooks/useTheme';

/**
 * TransactionCard — Tailwind (NativeWind) version.
 *
 * - Replaced StyleSheet with className Tailwind classes.
 * - Removed unused/commented code.
 * - Kept getBoxShadow for consistent elevation across platforms.
 */

export type TransactionStatus =
  | 'you-owe'
  | 'friend-owe'
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

/* --------------------------- Small Subcomponents --------------------------- */

const StatusPill: React.FC<{
  status?: TransactionStatus | 'neutral';
  label?: string;
  onPress?: () => void;
  prominent?: boolean;
}> = ({ status = 'neutral', label, onPress, prominent = false }) => {
  const getColor = useColor();
  // background / text / border choices expressed via Tailwind classes below
  let bgClass = '',
    textClass = '',
    borderClass = '',
    isButton = false;

  switch (status) {
    case 'you-owe':
      bgClass = getColor('danger200');
      textClass = getColor('danger', 'dark');
      break;
    case 'friend-owe':
      bgClass = getColor('success100');
      textClass = getColor('success', 'dark');
      break;
    case 'settle':
      bgClass = getColor('success');
      textClass = getColor('textWhite');
      isButton = true;
      break;
    case 'pending':
      bgClass = getColor('warning300');
      textClass = getColor('textPrimary');
      break;
    case 'error':
      bgClass = getColor('danger500');
      textClass = getColor('textWhite');
      borderClass = getColor('danger');
      break;
    default:
      bgClass = getColor('gray200');
      textClass = getColor('textPrimary');
  }

  const pill = (
    <View
      className={`self-end rounded-full px-3 py-1.5`}
      style={{ backgroundColor: bgClass, borderColor: borderClass }}>
      <Text className={`text-sm font-semibold`} style={{ color: textClass }}>
        {label}
      </Text>
    </View>
  );

  if (isButton || onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8} className="mt-1.5">
        {pill}
      </Pressable>
    );
  }

  return <View className="mt-1.5">{pill}</View>;
};

const BadgesRow: React.FC<{ badges?: BadgeItem[] }> = ({ badges }) => {
  const getColor = useColor();
  if (!badges?.length) return null;

  const getBadgeClasses = (status: string) => {
    if (status === 'you-owe') {
      return {
        container: getColor('danger400'),
        text: getColor('textPrimary'),
      };
    } else if (status === 'friend-owe') {
      return {
        container: getColor('success400', 'light'),
        text: getColor('textPrimary'),
      };
    } else {
      return {
        container: getColor('gray400'),
        text: getColor('textPrimary'),
      };
    }
  };

  return (
    <View className="mt-2 flex-row flex-wrap gap-x-2 gap-y-2">
      {badges.map((b, i) => {
        const { container: bg, text: color } = getBadgeClasses(b.status);
        return (
          <View key={i} style={{ borderColor: bg }} className={`mr-2 rounded-full border-2`}>
            <Text style={{ color }} className={`px-3 py-1.5 text-xs font-semibold`}>
              {b.title}
              {b.amount !== undefined ? ` · ₹${b.amount}` : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

/* --------------------------- TransactionCard --------------------------- */

const TransactionCard: React.FC<TransactionCardProps> = ({
  title,
  subtitle,
  img,
  amount,
  status,
  badges,
  compact,
  isNew,
  disabled,
  hasAttachment,
  icon,
  noShadow = false,
  className = '',
  onPress,
  onSettle,
  onRetry,
}) => {
  const { theme } = useTheme();
  const getColor = useColor();
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

  const paddingClass = compact ? 'py-2 px-3' : 'p-3.5';
  // combine base classes with any className prop the caller provides
  const containerClasses = `rounded-[14px] mb-3 ${paddingClass} ${className}`;
  const shadowStyle = !noShadow ? getBoxShadow('sm') : undefined;
  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onPress}
      disabled={!!disabled}
      className={containerClasses}
      style={[{ backgroundColor: theme.colors.card }, shadowStyle]}>
      <View className="flex-row items-center">
        <Avatar name={title} imageUri={img} icon={icon} />
        <View className="ml-3 flex-1">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-2">
              <Text style={{ color: theme.colors.textPrimary }} className="text-[16px] font-bold">
                {title}
                {isNew ? ' · New' : ''}
              </Text>

              {subtitle ? (
                <Text style={{ color: theme.colors.textSecondary }} className="mt-1 text-sm">
                  {subtitle}
                </Text>
              ) : null}

              {/* badges */}
              <BadgesRow badges={badges} />
            </View>

            <View className="items-end">
              {amount !== undefined ? (
                <Text
                  style={{ color: theme.colors.textPrimary }}
                  className="text-lg font-extrabold">
                  ₹{amount}
                </Text>
              ) : null}

              {status === 'settle' ? (
                <StatusPill
                  status="settle"
                  label={label || 'Settle'}
                  onPress={onSettle}
                  prominent
                />
              ) : status === 'error' && onRetry ? (
                <View className="mt-2 flex-row items-center">
                  <StatusPill status="error" label="Failed" />
                  <Pressable onPress={onRetry} className="ml-2 px-2 py-2">
                    <Text style={{ color: theme.colors.link }} className="font-bold">
                      Retry
                    </Text>
                  </Pressable>
                </View>
              ) : (
                status && <StatusPill status={status} label={label || ''} />
              )}
            </View>
          </View>

          {hasAttachment ? (
            <View className="mt-2">
              <Text style={{ color: theme.colors.link }} className="text-sm">
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
