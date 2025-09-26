// components/AutoBottomSheet.tsx
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { BottomSheetModal as BottomSheetModalType } from '@gorhom/bottom-sheet';
import React, { useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import type { ViewStyle } from 'react-native';

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional: cap height by keeping top inset. e.g. 0.08 = max ~92% screen */
  topInsetPct?: number; // default 0.08
  contentContainerStyle?: ViewStyle;
  /**
   * If true -> DO NOT wrap children inside BottomSheetScrollView.
   * Use this when children are a VirtualizedList (BottomSheetFlatList / FlatList).
   */
  avoidScrollView?: boolean;
};

export default function BottomSheet({
  open,
  onClose,
  children,
  topInsetPct = 0.08,
  contentContainerStyle,
  avoidScrollView = false,
}: Props) {
  const ref = useRef<BottomSheetModalType>(null);

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      opacity={0.4}
      pressBehavior="close"
    />
  );

  useEffect(() => {
    if (open) ref.current?.present();
    else ref.current?.dismiss();
  }, [open]);

  // Convert pct to px lazily (BottomSheet handles number as px)
  const topInset = useMemo(() => {
    const h = typeof window !== 'undefined' ? window.innerHeight : undefined;
    return h ? Math.round(h * topInsetPct) : 0;
  }, [topInsetPct]);

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing // 👈 auto height = content height
      topInset={topInset} // 👈 cap at ~ (1 - topInsetPct) of screen
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onDismiss={onClose}
      android_keyboardInputMode="adjustResize"
      keyboardBehavior={Platform.select({ ios: 'interactive', android: 'fillParent' })}
      keyboardBlurBehavior="restore"
      handleIndicatorStyle={{ backgroundColor: '#D1D5DB' }}>
      {/*
        If avoidScrollView === true, render children directly so callers
        can render a BottomSheetFlatList (VirtualizedList) without being wrapped.
      */}
      {avoidScrollView ? (
        <>{children}</>
      ) : (
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            { paddingTop: 12, paddingBottom: 16, paddingHorizontal: 16 },
            contentContainerStyle,
          ]}>
          {children}
        </BottomSheetScrollView>
      )}
    </BottomSheetModal>
  );
}
