import { fireEvent, render, screen } from '@testing-library/react-native';

import { AccountActions } from './account-actions';

it('opens notification settings from the account actions', async () => {
  const onOpenNotificationSettings = jest.fn();
  await render(
    <AccountActions
      loggingOut={false}
      logoutError={null}
      onOpenRentals={jest.fn()}
      onOpenNotificationSettings={onOpenNotificationSettings}
      onLogout={jest.fn()}
    />,
  );

  fireEvent.press(screen.getByRole('button', { name: '알림 설정' }));
  expect(onOpenNotificationSettings).toHaveBeenCalledTimes(1);
});
