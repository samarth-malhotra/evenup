// components/AutoBottomSheet.tsx
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';

import type { BottomSheetModal as BottomSheetModalType } from '@gorhom/bottom-sheet';
import type { ViewStyle } from 'react-native';

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional: cap height by keeping top inset. e.g. 0.08 = max ~92% screen */
  topInsetPct?: number; // default 0.08
  contentContainerStyle?: ViewStyle;
};

export default function BottomSheet({
  open,
  onClose,
  children,
  topInsetPct = 0.08,
  contentContainerStyle,
}: Props) {
  //   const snapPoints = useMemo(() => ['60%', '92%'], []);
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

  // Present/dismiss imperatively
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
      {/* <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'position' : undefined}
        keyboardVerticalOffset={0}>
      </KeyboardAvoidingView> */}
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          { paddingTop: 12, paddingBottom: 16, paddingHorizontal: 16 },
          contentContainerStyle,
        ]}>
        {children}
      </BottomSheetScrollView>
      {/* Put ALL your content inside; it will scroll only if capped */}
    </BottomSheetModal>
  );
}
