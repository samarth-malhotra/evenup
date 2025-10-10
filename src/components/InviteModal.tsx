// src/components/InviteModal.tsx
import axios from 'axios';
import { useState } from 'react';
import { Alert, Button, Modal, Share, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  contact: { contact_name?: string; phones?: string[]; emails?: string[] };
  onInvited?: (result: any) => void;
};

export default function InviteModal({ visible, onClose, groupId, contact, onInvited }: Props) {
  const [loading, setLoading] = useState(false);

  async function sendInvite({ channel = 'whatsapp', to }: { channel?: string; to: string }) {
    try {
      setLoading(true);

      // ✅ Use your Supabase edge function endpoint
      const url = `https://wrnepxzmmuzcsmjmadli.supabase.co/functions/v1/groups/${groupId}/invite`;

      const payload = {
        contact_name: contact.contact_name,
        invite_channel: channel,
        email: contact.emails?.[0] ?? null,
        phone: contact.phones?.[0] ?? null,
      };

      const resp = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          // include session token for authorization (important!)
          Authorization: `Bearer ${await getSupabaseAccessToken()}`,
        },
      });

      // ✅ Handle both snake_case and camelCase for safety
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
      console.error('sendInvite', err);
      Alert.alert('Invite error', err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  // 🔒 Example helper (replace with your Supabase auth helper)
  async function getSupabaseAccessToken() {
    const { supabase } = await import('@/services/supabase');
    const session = (await supabase.auth.getSession()).data.session;
    return session?.access_token;
  }

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
