// src/components/ContactDetails.tsx
import { Text, View } from 'react-native';

// import { capitalize } from '@/utils/helpers'; // optional local helper; or re-create below
import type { ContactItem as ContactItemType } from '@/stores/atoms/contacts';
import { formatPhoneInternational, normalizeEmail } from '@/utils/normalise';

const localCapitalize = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

export default function ContactDetails({
  item,
  isOwner,
}: {
  item: ContactItemType;
  isOwner?: boolean;
}) {
  return (
    <View>
      <Text className="text-base" numberOfLines={1} ellipsizeMode="tail">
        {isOwner ? 'You' : localCapitalize(item.name ?? 'Unnamed')}
      </Text>

      {item.phones && item.phones.length > 0 && (
        <View className="mt-1">
          {item.phones.map((p) => (
            <Text
              key={p.id}
              className="text-sm text-gray-500"
              numberOfLines={1}
              ellipsizeMode="tail">
              {p.label ? `${localCapitalize(p.label)}: ` : ''}
              {formatPhoneInternational ? formatPhoneInternational(p.number) : p.number}
            </Text>
          ))}
        </View>
      )}

      {item.emails && item.emails.length > 0 && (
        <View className="mt-1">
          {item.emails.map((e, i) => (
            <Text
              key={`e-${i}`}
              className="text-sm text-gray-500"
              numberOfLines={1}
              ellipsizeMode="tail">
              Email: {normalizeEmail ? normalizeEmail(e) : e}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}
