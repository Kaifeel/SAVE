import AppHeader from './AppHeader.jsx'
import BottomNavigation from './BottomNavigation.jsx'

export default function AppFrame({
  headerProps,
  navigationProps,
  chatDetailOpen,
  children,
  overlays,
}) {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center py-0 sm:py-6 px-0 sm:px-4">
      <div className="w-full max-w-[430px] h-[932px] sm:h-[844px] bg-white sm:rounded-[40px] sm:shadow-2xl overflow-hidden border border-slate-200 flex flex-col relative font-sans">
        <div className="bg-white px-6 pt-3 pb-1 flex justify-between items-center text-xs text-slate-500 font-semibold select-none border-b border-slate-50/50">
          <span>16:07</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-4 h-2.5 border border-slate-400 rounded-sm relative after:content-[''] after:absolute after:top-0.5 after:-right-1 after:w-0.5 after:h-1 after:bg-slate-400"></span>
            <span>5G</span>
          </div>
        </div>

        <AppHeader {...headerProps} />
        <main className={`flex-1 overflow-y-auto bg-slate-50/50 ${chatDetailOpen ? 'pb-0' : 'pb-20'}`}>
          {children}
        </main>
        <BottomNavigation {...navigationProps} />
        {overlays}
      </div>
    </div>
  )
}
