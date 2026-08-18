import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { useGoogleLogin } from '@/auth/google-login';
import { useAuthStore } from '@/auth/store';

import LoginScreen from './login';

jest.mock('@/auth/store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@/auth/google-login', () => ({
  useGoogleLogin: jest.fn(),
}));

const mockUseAuthStore = jest.mocked(useAuthStore);
const mockUseGoogleLogin = jest.mocked(useGoogleLogin);
const loginWithEmail = jest.fn<Promise<void>, [{ email: string; password: string }]>();
const prompt = jest.fn<Promise<void>, []>();

beforeEach(() => {
  jest.clearAllMocks();
  loginWithEmail.mockResolvedValue(undefined);
  prompt.mockResolvedValue(undefined);
  mockUseAuthStore.mockImplementation(selector =>
    selector({ loginWithEmail } as never),
  );
  mockUseGoogleLogin.mockReturnValue({ enabled: false, busy: false, error: null, prompt });
});

it('submits the entered email and password through the auth store', async () => {
  await render(<LoginScreen />);

  await fireEvent.changeText(screen.getByLabelText('이메일'), 'student@pukyong.ac.kr');
  await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'correct horse');
  await fireEvent.press(screen.getByRole('button', { name: '로그인' }));

  await waitFor(() =>
    expect(loginWithEmail).toHaveBeenCalledWith({
      email: 'student@pukyong.ac.kr',
      password: 'correct horse',
    }),
  );
});

it('announces validation errors without submitting empty credentials', async () => {
  await render(<LoginScreen />);

  await fireEvent.press(screen.getByRole('button', { name: '로그인' }));

  expect(await screen.findByText('이메일을 입력해주세요.')).toBeTruthy();
  expect(screen.getByText('비밀번호를 입력해주세요.')).toBeTruthy();
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(loginWithEmail).not.toHaveBeenCalled();
});

it('disables submit while an email login is pending', async () => {
  let resolveLogin!: () => void;
  loginWithEmail.mockReturnValue(
    new Promise<void>(resolve => {
      resolveLogin = resolve;
    }),
  );
  await render(<LoginScreen />);

  await fireEvent.changeText(screen.getByLabelText('이메일'), 'student@pukyong.ac.kr');
  await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'correct horse');
  await fireEvent.press(screen.getByRole('button', { name: '로그인' }));

  await waitFor(() =>
    expect(screen.getByRole('button', { name: '처리 중...' })).toBeDisabled(),
  );

  resolveLogin();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: '로그인' })).toBeEnabled(),
  );
});

it('shows Google entry only when the platform client ID is configured', async () => {
  const firstRender = await render(<LoginScreen />);
  expect(screen.queryByRole('button', { name: 'Google로 계속' })).toBeNull();

  await firstRender.unmount();
  mockUseGoogleLogin.mockReturnValue({ enabled: true, busy: false, error: null, prompt });
  await render(<LoginScreen />);

  await fireEvent.press(screen.getByRole('button', { name: 'Google로 계속' }));
  expect(prompt).toHaveBeenCalledTimes(1);
});

it('announces a Google store error and allows retry through the Google entry', async () => {
  mockUseGoogleLogin.mockReturnValue({
    enabled: true,
    busy: false,
    error: 'Google 계정 로그인을 완료하지 못했습니다.',
    prompt,
  });
  await render(<LoginScreen />);

  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.getByText('Google 계정 로그인을 완료하지 못했습니다.')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Google로 계속' }));
  expect(prompt).toHaveBeenCalledTimes(1);
});
