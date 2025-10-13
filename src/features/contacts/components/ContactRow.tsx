// src/components/ContactRow.tsx
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import type { ContactItem as ContactItemType } from '@/stores/atoms/contacts';

type Props = {
  contact: ContactItemType;
  isFromEven?: boolean;
  badge?: string | undefined;
  isOwner?: boolean;
  isSelf?: boolean;
  isGroupMember?: boolean;
  isRemoving?: boolean;
  onRemove?: () => void;
  onAddExisting?: () => void;
  onInvite?: () => void;
  renderDetails?: () => React.ReactNode;
};

const ContactRow: React.FC<Props> = ({
  contact,
  isFromEven,
  badge,
  isOwner,
  isSelf,
  isGroupMember,
  isRemoving,
  onRemove,
  onAddExisting,
  onInvite,
  renderDetails,
}) => {
  return (
    <TouchableOpacity className="flex-row items-start justify-between border-b border-gray-100 py-3">
      <View className="flex-1 flex-row items-start">
        <Avatar name={contact.name ?? '?'} size={36} />
        <View className="ml-3 flex-1">
          {renderDetails ? renderDetails() : <Text>{contact.name}</Text>}
        </View>
      </View>

      <View className="ml-2 flex-row items-center">
        {isFromEven ? (
          isOwner && !isSelf ? (
            <TouchableOpacity
              disabled
              className="rounded-full border border-gray-300 px-3 py-1 opacity-50">
              <Text className="text-sm text-gray-400">Remove</Text>
            </TouchableOpacity>
          ) : isSelf ? (
            <TouchableOpacity
              disabled={isRemoving}
              onPress={onRemove}
              className="flex-row items-center rounded-full border border-red-600 px-3 py-1">
              {isRemoving ? (
                <ActivityIndicator />
              ) : (
                <Text className="text-sm text-red-600">Leave</Text>
              )}
            </TouchableOpacity>
          ) : isGroupMember ? (
            <TouchableOpacity
              disabled={isRemoving}
              onPress={onRemove}
              className="flex-row items-center rounded-full border border-red-600 px-3 py-1">
              {isRemoving ? (
                <ActivityIndicator />
              ) : (
                <Text className="text-sm text-red-600">Remove</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={onAddExisting}
              className="border-primary-600 rounded-full border px-3 py-1">
              <Text className="text-primary-600 text-sm">Add</Text>
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity
            onPress={onInvite}
            className="border-primary-600 rounded-full border px-3 py-1">
            <Text className="text-primary-600 text-sm">Invite</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default ContactRow;
