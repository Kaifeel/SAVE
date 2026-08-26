import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { useGoogleLogin } from '@/auth/google-login';
import { useAuthStore } from '@/auth/store';
import { getUniversities } from '@/universities/api';

import SignupScreen from '@/app/signup';

jest.mock('@/auth/store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@/auth/google-login', () => ({
  useGoogleLogin: jest.fn(),
}));

jest.mock('@/universities/api', () => ({
  getUniversities: jest.fn(),
}));

const mockUseAuthStore = jest.mocked(useAuthStore);
const mockUseGoogleLogin = jest.mocked(useGoogleLogin);
const mockGetUniversities = jest.mocked(getUniversities);
const promptGoogle = jest.fn<Promise<void>, []>();
const signupWithEmail = jest.fn<Promise<void>, [{
  email: string;
  password: string;
  name: string;
  department: string;
  universityId: number;
}]>();
const universities = [
  { id: 1, name: '부경대학교' },
  { id: 2, name: '한국해양대학교' },
];

beforeEach(() => {
  jest.clearAllMocks();
  promptGoogle.mockResolvedValue(undefined);
  mockUseGoogleLogin.mockReturnValue({
    busy: false,
    enabled: false,
    error: null,
    prompt: promptGoogle,
  });
  signupWithEmail.mockResolvedValue(undefined);
  mockUseAuthStore.mockImplementation(selector =>
    selector({ signupWithEmail } as never),
  );
  mockGetUniversities.mockResolvedValue(universities);
});

it('matches the web Google continuation and uses graphical field icons', async () => {
  mockUseGoogleLogin.mockReturnValue({
    busy: false,
    enabled: true,
    error: null,
    prompt: promptGoogle,
  });

  await render(<SignupScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Google 계정으로 계속하기' }));

  expect(promptGoogle).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('google-logo', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByTestId('name-icon', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByTestId('email-icon', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByTestId('password-icon', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.queryByText('○')).toBeNull();
  expect(screen.queryByText('@')).toBeNull();
  expect(screen.queryByText('●')).toBeNull();
});

async function selectUniversity(name = '한국해양대학교') {
  await fireEvent.press(await screen.findByRole('button', { name: '대학교 선택' }));
  await fireEvent.press(screen.getByRole('button', { name }));
}

async function enterRequiredFields() {
  await fireEvent.changeText(screen.getByLabelText('이름'), '김SAVE');
  await fireEvent.changeText(screen.getByLabelText('학과'), '컴퓨터공학과');
  await fireEvent.changeText(screen.getByLabelText('이메일'), 'new@save.ac.kr');
  await fireEvent.changeText(screen.getByLabelText('비밀번호'), 'password123');
}

it('announces every required signup field and does not submit an empty form', async () => {
  await render(<SignupScreen />);
  await screen.findByRole('button', { name: '대학교 선택' });

  await fireEvent.press(screen.getByRole('button', { name: '회원가입' }));

  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.getByText('이름을 입력해주세요.')).toBeTruthy();
  expect(screen.getByText('대학교를 선택해주세요.')).toBeTruthy();
  expect(screen.getByText('학과를 입력해주세요.')).toBeTruthy();
  expect(screen.getByText('이메일을 입력해주세요.')).toBeTruthy();
  expect(screen.getByText('비밀번호를 입력해주세요.')).toBeTruthy();
  expect(signupWithEmail).not.toHaveBeenCalled();
});

it('selects a university from the real catalog and submits the exact required contract', async () => {
  let resolveCatalog!: (catalog: typeof universities) => void;
  mockGetUniversities.mockReturnValue(new Promise(resolve => {
    resolveCatalog = resolve;
  }));
  await render(<SignupScreen />);
  expect(screen.getByText('대학교 목록을 불러오는 중...')).toBeTruthy();
  resolveCatalog(universities);
  await selectUniversity();
  await enterRequiredFields();

  await fireEvent.press(screen.getByRole('button', { name: '회원가입' }));

  await waitFor(() => expect(signupWithEmail).toHaveBeenCalledWith({
    email: 'new@save.ac.kr',
    password: 'password123',
    name: '김SAVE',
    department: '컴퓨터공학과',
    universityId: 2,
  }));
  expect(mockGetUniversities).toHaveBeenCalledTimes(1);
});

it('disables signup and university selection while submission is pending', async () => {
  let resolveSignup!: () => void;
  signupWithEmail.mockReturnValue(new Promise<void>(resolve => {
    resolveSignup = resolve;
  }));
  await render(<SignupScreen />);
  await selectUniversity('부경대학교');
  await enterRequiredFields();

  await fireEvent.press(screen.getByRole('button', { name: '회원가입' }));

  await waitFor(() => {
    expect(screen.getByRole('button', { name: '처리 중...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '부경대학교' })).toBeDisabled();
  });

  resolveSignup();
  await waitFor(() => expect(screen.getByRole('button', { name: '회원가입' })).toBeEnabled());
});

it('shows a catalog error and retries loading without mock fallback options', async () => {
  mockGetUniversities
    .mockRejectedValueOnce(new Error('대학교 서버 연결 실패'))
    .mockResolvedValueOnce(universities);
  await render(<SignupScreen />);

  expect(await screen.findByText('대학교 서버 연결 실패')).toBeTruthy();
  expect(screen.queryByText('부경대학교')).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: '대학교 목록 다시 불러오기' }));

  await waitFor(() => expect(mockGetUniversities).toHaveBeenCalledTimes(2));
  await fireEvent.press(await screen.findByRole('button', { name: '대학교 선택' }));
  expect(screen.getByRole('button', { name: '부경대학교' })).toBeTruthy();
});

it('announces a signup API failure and re-enables submission', async () => {
  signupWithEmail.mockRejectedValue(new Error('이미 가입된 이메일입니다.'));
  await render(<SignupScreen />);
  await selectUniversity();
  await enterRequiredFields();

  await fireEvent.press(screen.getByRole('button', { name: '회원가입' }));

  expect(await screen.findByText('이미 가입된 이메일입니다.')).toBeTruthy();
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.getByRole('button', { name: '회원가입' })).toBeEnabled();
});
