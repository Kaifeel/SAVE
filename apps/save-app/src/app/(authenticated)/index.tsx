import { Redirect } from 'expo-router';

import { useAuthStore } from '@/auth/store';

export default function Index() {
  const user = useAuthStore(state => state.user);
  const profileComplete = Boolean(user?.department && user.universityId);

  return (
    <Redirect href={profileComplete
      ? '/(authenticated)/(tabs)'
      : '/(authenticated)/profile-setup'} />
  );
}
