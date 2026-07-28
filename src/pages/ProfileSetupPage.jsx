import { ChevronRight, PenTool } from 'lucide-react'

const departments = [
      '컴퓨터공학과',
      '경영학과',
      '디자인학부',
      '전자공학과',
      '기계공학과',
      '체육교육과',
      '미디어커뮤니케이션학과'
    ]

export default function ProfileSetupPage({
  memberName,
  setMemberName,
  memberDepartment,
  setMemberDepartment,
  memberUniversityId,
  setMemberUniversityId,
  universities,
  onComplete,
}) {
  return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center py-0 sm:py-6 px-0 sm:px-4">
        <div className="w-full max-w-[430px] h-[932px] sm:h-[844px] bg-white sm:rounded-[40px] sm:shadow-2xl overflow-hidden border border-slate-200 flex flex-col relative font-sans">
          <div className="bg-white px-6 pt-3 pb-1 flex justify-between items-center text-xs text-slate-500 font-semibold select-none">
            <span>16:07</span>
            <div className="flex items-center space-x-1.5">
              <span className="w-4 h-2.5 border border-slate-400 rounded-sm relative after:content-[''] after:absolute after:top-0.5 after:-right-1 after:w-0.5 after:h-1 after:bg-slate-400"></span>
              <span>5G</span>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!memberName.trim() || !memberDepartment || !memberUniversityId) return
              onComplete()
            }}
            className="flex-1 flex flex-col px-5 pt-6 pb-6"
          >
            <h1 className="text-[22px] font-black text-slate-900">회원 정보 입력</h1>

            <div className="mt-16 flex justify-center">
              <div className="w-28 h-28 rounded-full bg-slate-200 flex items-center justify-center">
                <PenTool className="w-10 h-10 text-slate-800" />
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div>
                <label htmlFor="profile-university" className="block text-sm font-bold text-slate-700 mb-1.5">대학교</label>
                <select
                  id="profile-university"
                  value={memberUniversityId || ''}
                  onChange={(e) => setMemberUniversityId(Number(e.target.value))}
                  className="w-full h-12 rounded-lg bg-slate-200 px-4 text-[15px] font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  required
                >
                  <option value="">대학교 선택</option>
                  {universities.map(university => (
                    <option key={university.id} value={university.id}>{university.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">이름</label>
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full h-12 rounded-lg bg-slate-200 px-4 text-[15px] font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">학과</label>
                <div className="relative">
                  <select
                    value={memberDepartment}
                    onChange={(e) => setMemberDepartment(e.target.value)}
                    className="w-full h-12 rounded-lg bg-slate-200 px-4 pr-12 text-[15px] font-semibold text-slate-800 outline-none appearance-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  >
                    <option value="">학과 선택</option>
                    {departments.map(department => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 w-7 h-7 text-white pointer-events-none" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!memberName.trim() || !memberDepartment || !memberUniversityId}
              className="mt-auto h-14 rounded-lg bg-slate-200 text-slate-900 font-bold text-lg disabled:text-slate-400 disabled:bg-slate-100 active:scale-[0.98] transition-all"
            >
              입력 완료
            </button>
          </form>
        </div>
      </div>
  )
}
