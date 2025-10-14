// src/components/SearchBar.tsx
import React from 'react';
import { TextInput } from 'react-native';

type Props = {
  placeholder?: string;
  value: string;
  onChangeText: (t: string) => void;
  onSubmit?: () => void;
};

const SearchBar: React.FC<Props> = ({ placeholder = 'Search', value, onChangeText, onSubmit }) => (
  <TextInput
    placeholder={placeholder}
    value={value}
    onChangeText={onChangeText}
    returnKeyType="search"
    onSubmitEditing={() => onSubmit?.()}
    className="mb-2 rounded-xl border border-gray-200 px-4 py-3"
    accessibilityLabel={placeholder}
  />
);

export default SearchBar;
