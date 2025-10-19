// app/groups/[id]/transactions/[txId].tsx
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import { useLocalSearchParams } from 'expo-router';
import { useAtomValue, useSetAtom } from 'jotai';
import { useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import AppHeader from '@/components/AppHeader';
import TransactionCard from '@/components/TransactionCard';
import AddBillSheet from '@/features/bills/components/AddBillSheet';
import {
  useAddTransactionComment,
  useTransactionDetails,
} from '@/features/groups/hooks/transactions';
import {
  useDeleteTransaction,
  useDeleteTransactionComment,
  useUpdateTransactionComment,
} from '@/features/groups/hooks/transactions.mutations';
import { useGroupDetail } from '@/features/groups/hooks/useGroupDetail';
import { addToastAtom } from '@/stores/atoms/toast';
import { userAtom } from '@/stores/atoms/user';
import { useTheme } from '@/theme/hooks/useTheme';

export default function GroupTransactionDetail() {
  const { txId } = useLocalSearchParams<{ txId: string }>();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const currentUser = useAtomValue(userAtom);
  const addToast = useSetAtom(addToastAtom);

  // NOTE: data is TransactionDetails | undefined
  const { data: tx, isFetching, isError, error } = useTransactionDetails(txId);
  const { id: groupId } = useLocalSearchParams<{ id: string }>();

  const addComment = useAddTransactionComment();
  const deleteTx = useDeleteTransaction();
  const updateComment = useUpdateTransactionComment();
  const deleteComment = useDeleteTransactionComment();

  const [commentText, setCommentText] = useState('');
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editInitial, setEditInitial] = useState<any | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // comment editing inline
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  const { data: group } = useGroupDetail(currentUser?.id, groupId ?? undefined);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => (
        <AppHeader
          title={tx?.title ?? 'Transaction'}
          showBackButton
          rightActions={
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => {
                  if (!tx) return;
                  // prepare initial payload for AddBillSheet edit
                  setEditInitial({
                    id: tx.id,
                    title: tx.title,
                    amount: tx.amount,
                    date: tx.date ?? tx.created_at,
                    paidBy: tx.paidBy,
                    participants:
                      tx.participants?.map((p) => ({ userId: p.userId, amount: p.amount })) ?? [],
                    splitMethod: tx.splitMethod,
                    metadata: tx.metadata,
                  });
                  setEditSheetOpen(true);
                }}
                className="p-2">
                <Ionicons name="create-outline" size={22} color={theme.colors.textWhite} />
              </Pressable>

              <Pressable
                onPress={() => {
                  setDeleteConfirmOpen(true);
                }}
                className="p-2">
                <Ionicons name="trash-outline" size={22} color={theme.colors.textWhite} />
              </Pressable>
            </View>
          }
        />
      ),
    });
  }, [navigation, tx?.title, tx, theme.colors.textWhite]);

  const payerAmount = useMemo(
    () => tx?.participants?.find((p) => p.userId === tx?.paidBy)?.amount ?? tx?.amount ?? 0,
    [tx]
  );

  const handleAddComment = async () => {
    const text = commentText.trim();
    if (!text || !txId || !currentUser?.id) return;
    try {
      await addComment.mutateAsync({
        transaction_id: txId,
        created_by: currentUser.id,
        body: text,
      });
      setCommentText('');
    } catch (err: any) {
      addToast({ title: 'Error', message: err?.message ?? 'Failed to add comment', type: 'error' });
    }
  };

  const handleConfirmDeleteTx = async () => {
    if (!txId || !currentUser?.id) return;
    setDeleteConfirmOpen(false);
    try {
      await deleteTx.mutateAsync({
        txId,
        groupId: tx?.groupId ?? undefined,
        performedBy: currentUser.id,
      });
      addToast({ title: 'Deleted', message: 'Transaction deleted', type: 'success' });
      navigation.goBack();
    } catch (err: any) {
      addToast({ title: 'Error', message: err?.message ?? 'Delete failed', type: 'error' });
    }
  };

  // comment editing handlers
  const startEditComment = (c: any) => {
    setEditingCommentId(c.id);
    setEditingCommentText(c.message ?? c.body ?? '');
  };
  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };
  const saveEditComment = async () => {
    if (!editingCommentId) return;
    const body = editingCommentText.trim();
    if (!body)
      return addToast({ title: 'Validation', message: 'Comment cannot be empty', type: 'error' });
    try {
      await updateComment.mutateAsync({ commentId: editingCommentId, body });
      addToast({ title: 'Saved', message: 'Comment updated', type: 'success' });
      cancelEditComment();
    } catch (err: any) {
      addToast({ title: 'Error', message: err?.message ?? 'Update failed', type: 'error' });
    }
  };
  const confirmDeleteComment = (commentId: string) => {
    Alert.alert('Delete comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment.mutateAsync({ commentId });
            addToast({ title: 'Deleted', message: 'Comment removed', type: 'success' });
          } catch (err: any) {
            addToast({ title: 'Error', message: err?.message ?? 'Delete failed', type: 'error' });
          }
        },
      },
    ]);
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
              Paid by {tx.paidByName} on{' '}
              {tx.date ?? dayjs(tx.created_at ?? new Date()).format('YYYY-MM-DD')}
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
              {tx.participants.map((p: any) => (
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
            keyExtractor={(c: any) => c.id}
            renderItem={({ item }) => {
              const isEditing = editingCommentId === item.id;
              return (
                <View className="mb-3 px-4">
                  <View className="rounded-2xl bg-gray-100 p-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-semibold text-gray-800">
                        {item.user ?? item.userId ?? 'Unknown'}
                      </Text>

                      {item.userId === currentUser?.id && (
                        <View className="flex-row items-center">
                          <Pressable onPress={() => startEditComment(item)} className="p-2">
                            <Ionicons name="create-outline" size={18} color="#374151" />
                          </Pressable>
                          <Pressable onPress={() => confirmDeleteComment(item.id)} className="p-2">
                            <Ionicons name="trash-outline" size={18} color="#ef4444" />
                          </Pressable>
                        </View>
                      )}
                    </View>

                    {isEditing ? (
                      <>
                        <TextInput
                          value={editingCommentText}
                          onChangeText={setEditingCommentText}
                          placeholder="Edit comment..."
                          placeholderTextColor="#9CA3AF"
                          className="mt-2 rounded-lg bg-white px-3 py-2"
                        />
                        <View className="mt-2 flex-row justify-end gap-2">
                          <Pressable onPress={cancelEditComment} className="px-3 py-2">
                            <Text className="text-sm text-gray-600">Cancel</Text>
                          </Pressable>
                          <Pressable
                            onPress={saveEditComment}
                            className="rounded bg-indigo-600 px-3 py-2">
                            <Text className="text-sm text-white">Save</Text>
                          </Pressable>
                        </View>
                      </>
                    ) : (
                      <>
                        <Text className="mt-1 text-base text-gray-700">
                          {item.message ?? item.body}
                        </Text>
                        <Text className="mt-1 text-xs text-gray-400">
                          {(item.createdAt ?? '').slice(0, 10)}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              );
            }}
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

      {/* Edit AddBillSheet (re-uses same sheet) */}
      <AddBillSheet
        open={editSheetOpen}
        onClose={() => setEditSheetOpen(false)}
        onSaved={() => {
          addToast({ title: 'Updated', message: 'Transaction updated', type: 'success' });
          setEditSheetOpen(false);
        }}
        members={group?.members}
        mode="edit"
        initial={editInitial}
        groupId={tx?.groupId ?? null}
        // Note: no onSelectPaidBy/onSelectParticipants here -> AddBillSheet will use its internal modals in edit mode
      />

      {/* Delete confirm modal (simple) */}
      {deleteConfirmOpen && (
        <View className="absolute inset-0 items-center justify-center bg-black/40 px-6">
          <View className="w-full rounded-2xl bg-white p-4">
            <Text className="mb-2 text-lg font-semibold">Delete transaction</Text>
            <Text className="mb-4 text-gray-600">
              Are you sure you want to delete this transaction? This cannot be undone.
            </Text>
            <View className="flex-row justify-end">
              <Pressable onPress={() => setDeleteConfirmOpen(false)} className="mr-2 px-4 py-2">
                <Text className="text-base text-gray-600">Cancel</Text>
              </Pressable>
              <Pressable onPress={handleConfirmDeleteTx} className="rounded bg-red-600 px-4 py-2">
                <Text className="text-white">Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </>
  );
}
