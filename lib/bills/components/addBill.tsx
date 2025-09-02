// app/bills/addBill.tsx
import AppHeader from '@/lib/shared/components/AppHeader';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useNavigation } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}>
        {/* Bill Info */}
        <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <Text className="mb-3 text-lg font-semibold">Bill Info</Text>

          <Text className="mb-1 text-sm text-gray-600">Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="E.g. Dinner at BBQ Nation"
            className="mb-3 rounded-xl border border-gray-300 px-4 py-3"
          />

          <Text className="mb-1 text-sm text-gray-600">Amount</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="₹ 0.00"
            keyboardType="numeric"
            className="mb-3 rounded-xl border border-gray-300 px-4 py-3"
          />

          <Text className="mb-1 text-sm text-gray-600">Date</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            className="flex-row items-center justify-between rounded-xl border border-gray-300 px-4 py-3">
            <Text>{dayjs(date).format('DD MMM YYYY')}</Text>
            <MaterialIcons name="calendar-today" size={20} color="gray" />
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
        <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <Text className="mb-3 text-lg font-semibold">Payment</Text>

          <Text className="mb-1 text-sm text-gray-600">Paid By</Text>
          <Pressable className="flex-row items-center justify-between rounded-xl border border-gray-300 px-4 py-3">
            <Text className={paidBy ? 'text-black' : 'text-gray-400'}>
              {paidBy || 'Select person'}
            </Text>
            <MaterialIcons name="expand-more" size={24} color="gray" />
          </Pressable>
          {/* TODO: Replace with actual dropdown/members modal */}
        </View>

        {/* Participants */}
        <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <Text className="mb-3 text-lg font-semibold">Participants</Text>

          <Pressable className="flex-row items-center justify-between rounded-xl border border-gray-300 px-4 py-3">
            <Text className="text-gray-400">Select group members</Text>
            <MaterialIcons name="group-add" size={22} color="gray" />
          </Pressable>
          {/* TODO: Replace with multi-select modal */}
        </View>
      </ScrollView>

      {/* Floating Save Button */}
      <View className="absolute bottom-4 left-4 right-4">
        <TouchableOpacity onPress={handleSave} className="rounded-2xl bg-blue-500 py-4 shadow-md">
          <Text className="text-center text-lg font-semibold text-white">Save Bill</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
