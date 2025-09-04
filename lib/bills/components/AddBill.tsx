import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useNavigation } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';

import AppHeader from '@/lib/shared/components/AppHeader';
import ThemedSafeArea from '@/lib/shared/components/ThemedSafeArea';

export default function AddBillScreen() {
  const navigation = useNavigation();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paidBy, setPaidBy] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);

  const handleSave = () => {
    console.log({ title, amount, date, paidBy, participants });
    // TODO: integrate save logic
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => <AppHeader title="Add Bill" showBackButton />,
    });
  }, [navigation]);

  return (
    <>
      <ThemedSafeArea scroll padding={16}>
        {/* Bill Info */}
        <View className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
          <Text className="mb-4 text-base font-semibold text-gray-700">Bill Info</Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title (e.g. Dinner at BBQ Nation)"
            placeholderTextColor="#9CA3AF"
            className="mb-3 rounded-xl bg-gray-50 px-4 py-3 text-base text-gray-800"
          />

          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="Amount (₹ 0.00)"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            className="mb-3 rounded-xl bg-gray-50 px-4 py-3 text-base text-gray-800"
          />

          <Pressable
            onPress={() => setShowDatePicker(true)}
            className="flex-row items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
            <Text className="text-base text-gray-800">{dayjs(date).format('DD MMM YYYY')}</Text>
            <MaterialIcons name="calendar-today" size={20} color="#6B7280" />
          </Pressable>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="calendar"
              onChange={(event, selected) => {
                setShowDatePicker(false);
                if (selected) setDate(selected);
              }}
            />
          )}
        </View>

        {/* Payment Details */}
        <View className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
          <Text className="mb-4 text-base font-semibold text-gray-700">Payment</Text>

          <Pressable className="flex-row items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
            <Text className={paidBy ? 'text-gray-800' : 'text-gray-400'}>
              {paidBy || 'Select person'}
            </Text>
            <MaterialIcons name="expand-more" size={24} color="#6B7280" />
          </Pressable>
          {/* TODO: Replace with dropdown/members modal */}
        </View>

        {/* Participants */}
        <View className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
          <Text className="mb-4 text-base font-semibold text-gray-700">Participants</Text>

          <Pressable className="flex-row items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
            <Text className="text-gray-400">Select group members</Text>
            <MaterialIcons name="group-add" size={22} color="#6B7280" />
          </Pressable>
          {/* TODO: Replace with multi-select modal */}
        </View>
      </ThemedSafeArea>

      {/* Floating Save Button */}
      <View className="absolute bottom-4 left-4 right-4">
        <TouchableOpacity
          onPress={handleSave}
          className="rounded-full bg-blue-600 py-4 shadow-lg active:bg-blue-700">
          <Text className="text-center text-lg font-semibold text-white">Save Bill</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
