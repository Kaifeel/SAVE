import { Send } from 'lucide-react'

export default function ChatComposer({ value, onChange, onSend }) {
  return (
    <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
      <input
        type="text"
        placeholder="메시지 입력..."
        value={value}
        onChange={event => onChange(event.target.value)}
        onKeyDown={event => event.key === 'Enter' && onSend()}
        className="flex-1 bg-slate-100 rounded-2xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
      />
      <button
        onClick={onSend}
        className="w-11 h-11 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center hover:bg-indigo-600 hover:text-white active:scale-95 transition-all"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  )
}
