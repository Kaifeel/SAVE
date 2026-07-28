import { afterEach, expect, it, vi } from 'vitest'
import { signUpWithEmail } from './auth'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('includes university_id in the signup contract', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ access_token: 'jwt' }),
    { status: 201, headers: { 'Content-Type': 'application/json' } },
  ))
  vi.stubGlobal('fetch', fetchMock)

  await signUpWithEmail({
    email: 'student@pknu.ac.kr',
    password: 'password123',
    name: '학생',
    department: '컴퓨터공학과',
    universityId: 1,
  })

  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
    university_id: 1,
  })
})
