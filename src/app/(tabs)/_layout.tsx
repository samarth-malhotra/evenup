// // app/(tabs)/_layout.tsx
// import { useTheme } from '@/hooks/useTheme';
// import { MaterialCommunityIcons } from '@expo/vector-icons';
// import { Tabs } from 'expo-router';
// import { Pressable, ViewStyle } from 'react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';

// function TabButton(props: any) {
//   const { children, onPress, style } = props;

//   return (
//     <Pressable
//       onPress={onPress}
//       style={[
//         style,
//         {
//           alignItems: 'center',
//           justifyContent: 'center',
//         } as ViewStyle,
//       ]}
//       // 👇 disables ripple/opacity feedback completely
//       android_ripple={null}
//       android_disableSound>
//       {children}
//     </Pressable>
//   );
// }

// export default function TabsLayout() {
//   const { theme } = useTheme();
//   const insets = useSafeAreaInsets();

//   return (
//     <Tabs
//       screenOptions={{
//         headerShown: false,
//         tabBarActiveTintColor: theme.colors.primary.DEFAULT,
//         tabBarInactiveTintColor: theme.colors.textPrimary,

//         tabBarStyle: {
//           backgroundColor: theme.colors.background,
//           borderTopWidth: 0,

//           // use safe area bottom + reasonable base height
//           height: 56 + (insets.bottom ?? 0),
//           paddingBottom: insets.bottom ?? 8,
//         },
//         tabBarItemStyle: {
//           paddingVertical: 4,
//         },
//         tabBarLabelStyle: {
//           fontSize: 12,
//           marginTop: 2,
//         },
//         tabBarButton: (props: any) => <TabButton {...props} />,
//         // optional: replace default ripple if you want consistent no-feedback touch
//         // tabBarButton: (props: any) => (
//         //   <TouchableOpacity {...props} activeOpacity={0.85} style={props.style} />
//         // ),
//       }}>
//       {/* Use the same names as your files under app/(tabs) */}
//       <Tabs.Screen
//         name="index" // if your file is app/(tabs)/index.tsx - remove duplicate 'home' file
//         options={{
//           title: 'Home',
//           tabBarIcon: ({ color, size }) => (
//             <MaterialCommunityIcons name="home" color={color} size={size} />
//           ),
//         }}
//       />

//       <Tabs.Screen
//         name="groups"
//         options={{
//           title: 'Groups',
//           tabBarIcon: ({ color, size }) => (
//             <MaterialCommunityIcons name="account-group" color={color} size={size} />
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="friends"
//         options={{
//           title: 'Friends',
//           tabBarIcon: ({ color, size }) => (
//             <MaterialCommunityIcons name="account-multiple" color={color} size={size} />
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="profile"
//         options={{
//           title: 'Profile',
//           tabBarIcon: ({ color, size }) => (
//             <MaterialCommunityIcons name="account" color={color} size={size} />
//           ),
//         }}
//       />
//     </Tabs>
//   );
// }

// app/(tabs)/_layout.tsx
import { useAuth } from '@/features/auth/components/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Pressable, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { useAuth } from '@/lib/auth/AuthProvider'; // make sure this path matches your project

function TabButton(props: any) {
  const { children, onPress, style } = props;

  return (
    <Pressable
      onPress={onPress}
      style={[
        style,
        {
          alignItems: 'center',
          justifyContent: 'center',
        } as ViewStyle,
      ]}
      // disables ripple/opacity feedback completely on Android
      android_ripple={null}
      android_disableSound>
      {children}
    </Pressable>
  );
}

export default function TabsLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isLoading, user } = useAuth();

  // wait until auth is initialized by the AuthProvider
  if (isLoading) return null;

  // if not logged in, redirect to login (declarative)
  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary.DEFAULT,
        tabBarInactiveTintColor: theme.colors.textPrimary,

        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopWidth: 0,

          // use safe area bottom + reasonable base height
          height: 56 + (insets.bottom ?? 0),
          paddingBottom: insets.bottom ?? 8,
          // keep overflow visible only if you expect effects to overflow
          overflow: 'visible',
        },
        tabBarItemStyle: {
          paddingVertical: 4,
          overflow: 'visible',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 2,
        },
        tabBarButton: (props: any) => <TabButton {...props} />,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-multiple" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
