// src/components/InviteModal.tsx
import React from 'react';
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from 'react-native';

export type InviteOption = {
  id: string;
  label: string;
  kind: 'phone' | 'email' | 'own';
  raw: string;
  disabled?: boolean;
};

type Props = {
  visible: boolean;
  options: InviteOption[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  loading?: boolean;
  onCancel: () => void;
  onInvite: () => void;
  title?: string;
};

const InviteModal: React.FC<Props> = ({
  visible,
  options,
  selectedId,
  setSelectedId,
  loading,
  onCancel,
  onInvite,
  title,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-2xl bg-white p-4">
          <Text className="mb-2 text-lg font-semibold">{title ?? 'Invite'}</Text>
          <Text className="mb-4 text-sm text-gray-500">Choose how you'd like to invite</Text>

          {options.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              disabled={opt.disabled}
              onPress={() => !opt.disabled && setSelectedId(opt.id)}
              className={`flex-row items-center justify-between py-3 ${opt.disabled ? 'opacity-40' : ''}`}>
              <View>
                <Text className="text-base">{opt.label}</Text>
              </View>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#CCC',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {selectedId === opt.id ? (
                  <View
                    style={{ width: 12, height: 12, borderRadius: 12, backgroundColor: '#2563EB' }}
                  />
                ) : null}
              </View>
            </TouchableOpacity>
          ))}

          <View className="mt-4 flex-row justify-end">
            <TouchableOpacity
              onPress={onCancel}
              className="mr-2 rounded-lg border border-gray-200 px-4 py-2">
              <Text>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onInvite}
              disabled={loading || options.every((o) => o.disabled)}
              className={`rounded-lg border border-gray-200 px-4 py-2 ${loading ? 'opacity-60' : 'bg-primary'}`}>
              {loading ? <ActivityIndicator /> : <Text>Invite</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default InviteModal;
