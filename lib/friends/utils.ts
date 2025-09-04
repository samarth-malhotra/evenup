export const amountColor = (rel: string) =>
  rel === 'owe' ? 'text-red-600' : rel === 'owed' ? 'text-green-600' : 'text-gray-500';

export const relationLabel = (rel: string) =>
  rel === 'owe' ? 'You owe' : rel === 'owed' ? 'Owes you' : 'Settled';

export const chipClasses = (rel: string) =>
  rel === 'owe'
    ? 'bg-red-50 text-red-700'
    : rel === 'owed'
      ? 'bg-green-50 text-green-700'
      : 'bg-gray-100 text-gray-600';
