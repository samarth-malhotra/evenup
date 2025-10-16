// app/groups/[id]/transactions/[txId].tsx
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { useAtomValue } from 'jotai';
import { useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import AppHeader from '@/components/AppHeader';
import TransactionCard from '@/components/TransactionCard';
import {
  useAddTransactionComment,
  useTransactionDetails,
} from '@/features/groups/hooks/transactions';
import { userAtom } from '@/stores/atoms/user';
import { useTheme } from '@/theme/hooks/useTheme';

export default function GroupTransactionDetail() {
  const { txId } = useLocalSearchParams<{ txId: string }>();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const currentUser = useAtomValue(userAtom);

  const { data: tx, isFetching, isError, error } = useTransactionDetails(txId);
  const addComment = useAddTransactionComment();
  const [commentText, setCommentText] = useState('');

  // header uses tx.title when available
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => (
        <AppHeader
          title={tx?.title ?? 'Transaction'}
          showBackButton
          rightActions={
            <Pressable
              onPress={() => {
                /* open edit */
              }}
              className="p-2">
              <Ionicons name="create-outline" size={22} color={theme.colors.textWhite} />
            </Pressable>
          }
        />
      ),
    });
  }, [navigation, tx?.title, theme.colors.textWhite]);

  const payerAmount = useMemo(
    () => tx?.participants?.find((p) => p.userId === tx?.paidBy)?.amount ?? tx?.amount ?? 0,
    [tx]
  );

  const handleAddComment = () => {
    const text = commentText.trim();
    if (!text || !txId || !currentUser?.id) return;
    addComment.mutate({ transaction_id: txId, created_by: currentUser.id, body: text });
    setCommentText('');
  };

  if (isFetching) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError || !tx) {
    return (
      <View className="flex-1 p-4">
        <Text className="text-red-500">
          {isError
            ? ((error as any)?.message ?? 'Failed to load transaction')
            : 'Transaction not found'}
        </Text>
      </View>
    );
  }

  return (
    <>
      <View className="px-4 pt-2">
        {/* Header summary */}
        <View className="mb-4 flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text
              style={{ color: theme.colors.primary.DEFAULT }}
              className="mt-2 text-lg font-medium">
              {tx.splitMethod
                ? `${tx.splitMethod.charAt(0).toUpperCase()}${tx.splitMethod.slice(1).toLowerCase()} Split`
                : 'Split'}
            </Text>
            <Text style={{ color: theme.colors.textSecondary }} className="mt-1 text-sm">
              Paid by {tx.paidByName} on {tx.date}
            </Text>
          </View>

          <View className="items-end">
            <Text
              style={{ color: theme.colors.primary.DEFAULT }}
              className="text-3xl font-extrabold">
              ₹{tx.amount}
            </Text>
            <Text style={{ color: theme.colors.textSecondary }} className="mt-1 text-sm">
              Total
            </Text>
          </View>
        </View>

        {/* Participants */}
        <View className="mb-2">
          <Text
            style={{ color: theme.colors.textPrimary }}
            className="mb-3 text-base font-semibold">
            Participants
          </Text>

          {tx.participants?.length === 0 ? (
            <Text style={{ color: theme.colors.textSecondary }} className="text-sm">
              No participants.
            </Text>
          ) : (
            <>
              {tx.participants.map((p) => (
                <TransactionCard
                  key={p.userId}
                  title={p.userId === currentUser?.id ? 'You' : (p.name ?? 'Member')}
                  subtitle={p.userId === tx.paidBy ? 'Paid' : 'Owes'}
                  avatarInitials={(p.name ?? 'M').slice(0, 2).toUpperCase()}
                  amount={p.amount}
                  compact
                />
              ))}
            </>
          )}
        </View>
      </View>

      {/* Comments + Input pinned */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View className="flex-1">
          <FlatList
            data={tx.comments ?? []}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <View className="mb-3 px-4">
                <View className="rounded-2xl bg-gray-100 p-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-gray-800">{item.user}</Text>
                  </View>
                  <Text className="mt-1 text-base text-gray-700">{item.message}</Text>
                  <Text className="mt-1 text-xs text-gray-400">{item.createdAt?.slice(0, 10)}</Text>
                </View>
              </View>
            )}
            contentContainerStyle={{ paddingVertical: 8 }}
            ListEmptyComponent={() => (
              <View className="p-4">
                <Text className="text-sm text-gray-500">No comments yet</Text>
              </View>
            )}
          />
        </View>

        <View className="flex-row items-center border-t border-gray-200 bg-white p-3">
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Add a comment..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 rounded-full bg-gray-50 px-4 py-2 text-base text-gray-800"
          />
          <Pressable onPress={handleAddComment} className="ml-2 rounded-full bg-indigo-600 p-3">
            <Ionicons name="send" size={20} color="white" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
