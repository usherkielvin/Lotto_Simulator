import { useNetInfo } from '@react-native-community/netinfo';

export function useConnectivity() {
  const netInfo = useNetInfo();

  const isOnline = (netInfo.isInternetReachable ?? netInfo.isConnected ?? true) === true;

  return {
    isOnline,
    isConnected: netInfo.isConnected,
    isInternetReachable: netInfo.isInternetReachable,
  };
}