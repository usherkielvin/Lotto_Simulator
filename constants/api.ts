import { Platform } from 'react-native';

// On Android emulator, localhost refers to the emulator itself — use 10.0.2.2 to reach the host machine.
// On iOS simulator and web, localhost works fine.
const BASE =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8099/api'
    : 'http://localhost:8099/api';

export const API_BASE = BASE;
