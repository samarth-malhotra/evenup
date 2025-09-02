// theme/paper.ts
import {
  MD3LightTheme as DefaultLightTheme,
  MD3DarkTheme as DefaultDarkTheme,
} from 'react-native-paper';

export const lightTheme = {
  ...DefaultLightTheme,
  colors: {
    ...DefaultLightTheme.colors,
    primary: 'rgb(0, 98, 255)',
    secondary: 'rgb(98, 99, 125)',
    surface: '#ffffff',
    background: '#f8fafc',
  },
};

export const darkTheme = {
  ...DefaultDarkTheme,
  colors: {
    ...DefaultDarkTheme.colors,
    primary: 'rgb(120, 178, 255)',
    secondary: 'rgb(166, 167, 188)',
    surface: '#0b0f17',
    background: '#0b0f17',
  },
};
