// src/components/InviteModal.tsx
import axios from 'axios';
import { useState } from 'react';
import { Alert, Button, Modal, Share, Text, View } from 'react-native';

import type { GroupInvitePayloadType } from '@/features/contacts/components/ContactList';
import { useAccessToken } from '@/hooks/useAccessToken';

type Props = {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  contact: { contact_name?: string; phones?: string[]; emails?: string[] };
  onInvited?: (result: any) => void;
};

export default function InviteModal({ visible, onClose, groupId, contact, onInvited }: Props) {
  const [loading, setLoading] = useState(false);
  const { accessToken } = useAccessToken(); // keep original hook usage

  async function sendInvite({ channel = 'whatsapp', to }: { channel?: string; to: string }) {
    try {
      setLoading(true);

      const FUNCTION_ROOT = 'https://wrnepxzmmuzcsmjmadli.supabase.co/functions/v1/groups-invite';
      const url = `${FUNCTION_ROOT.replace(/\/$/, '')}/groups/${groupId}/invite`;

      const payload: GroupInvitePayloadType = {
        contact_name: contact.contact_name,
        invite_channel: 'whatsapp',
        email: contact.emails?.[0],
        phone: contact.phones?.[0],
        type: 'new',
      };
      const resp = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 15000,
      });

      const inviteLink = resp.data.inviteLink || resp.data.invite_link;
      if (!inviteLink) {
        Alert.alert('Invite failed', 'No invite link returned from server');
        return;
      }

      await Share.share({
        message: `${contact.contact_name || 'Friend'}, join my EvenUp group: ${inviteLink}`,
      });

      onInvited?.(resp.data);
      onClose();
    } catch (err: any) {
      console.error('error message:', err.message);
      Alert.alert('Invite error', err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  // 🔒 Example helper (replace with your Supabase auth helper)
  // async function getSupabaseAccessToken() {
  //   const { supabase } = await import('@/services/supabase');
  //   const session = (await supabase.auth.getSession()).data.session;
  //   return session?.access_token;
  // }
  // console.log("contact: ", contact);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: 20,
          backgroundColor: 'rgba(0,0,0,0.4)',
        }}>
        <View style={{ backgroundColor: 'white', borderRadius: 8, padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600' }}>Invite {contact.contact_name}</Text>
          <Text style={{ marginTop: 8 }}>
            {contact.phones?.join(', ') || contact.emails?.join(', ')}
          </Text>
          <View style={{ marginTop: 16 }}>
            {contact.phones?.map((p) => (
              <Button
                key={p}
                title={`Invite via WhatsApp (${p})`}
                onPress={() => sendInvite({ channel: 'whatsapp', to: p })}
                disabled={loading}
              />
            ))}
            {contact.emails?.map((e) => (
              <Button
                key={e}
                title={`Invite via Email (${e})`}
                onPress={() => sendInvite({ channel: 'email', to: e })}
                disabled={loading}
              />
            ))}
            {!contact.phones?.length && !contact.emails?.length && (
              <Button
                title="Enter manually"
                onPress={() => Alert.alert('Manual entry not implemented yet')}
              />
            )}
            <Button title="Cancel" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
