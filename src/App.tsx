import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, User, CheckCircle2, X, Phone, MapPin, ChevronLeft } from 'lucide-react';

// --- Types ---
interface Booking {
  BookingID: string;
  UserPhone: string;
  BookingDate: string;
  TimeSlot: string;
  Status: number; // 0: cancelled, 1: booked, 2: verified
  CreatedAt: string;
  RoomNumber: string;
  maskedPhone: string;
}

interface BookingsData {
  [date: string]: {
    [slot: string]: Booking;
  };
}

// --- Constants ---
const SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00"
];

const TennisBallIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#DFFF00" stroke="#000" strokeWidth="1"/>
    <path d="M5 12C5 12 8 12 10 15M19 12C19 12 16 12 14 9" stroke="#000" strokeWidth="1" strokeLinecap="round"/>
    <path d="M7 7C9 9 9 15 7 17M17 7C15 9 15 15 17 17" stroke="#000" strokeWidth="0.5" strokeLinecap="round" opacity="0.3"/>
  </svg>
);

export default function App() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [bookings, setBookings] = useState<BookingsData>({});
  const [phone, setPhone] = useState<string>(localStorage.getItem('jiahong_phone') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('jiahong_phone'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSelection, setCurrentSelection] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'my' | 'admin'>('grid');
  const [successBooking, setSuccessBooking] = useState<Booking | null>(null);
  const [showConvention, setShowConvention] = useState(false);
  const [residents, setResidents] = useState<Record<string, string>>({});
  const [newResident, setNewResident] = useState({ phone: '', room: '' });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(!!sessionStorage.getItem('jiahong_admin'));
  const [adminCreds, setAdminCreds] = useState({ username: '', password: '' });
  const [newAdminPassword, setNewAdminPassword] = useState('');

  const dates = useMemo(() => {
    const list = [];
    const now = new Date();
    const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Add today
    list.push(formatDate(current));
    
    // Add remaining days until Sunday (0)
    while (current.getDay() !== 0) {
      current.setDate(current.getDate() + 1);
      list.push(formatDate(current));
    }
    return list;
  }, []);

  useEffect(() => {
    if (!selectedDate) setSelectedDate(dates[0]);
    fetchBookings();
    fetchResidents(); // Fetch on mount for login validation
  }, [dates]);

  const fetchBookings = async () => {
    try {
      const res = await fetch('api/bookings');
      const data = await res.json();
      setBookings(data);
    } catch (err) {
      console.error('Failed to fetch bookings', err);
    }
  };

  const fetchResidents = async () => {
    try {
      const res = await fetch('api/residents');
      const data = await res.json();
      setResidents(data);
    } catch (err) {
      console.error('Failed to fetch residents', err);
    }
  };

  const addResident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResident.phone || !newResident.room) return;
    setLoading(true);
    try {
      const res = await fetch('api/residents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newResident),
      });
      if (res.ok) {
        setNewResident({ phone: '', room: '' });
        fetchResidents();
      }
    } catch (err) {
      setError('添加失败');
    } finally {
      setLoading(false);
    }
  };

  const deleteResident = async (phone: string) => {
    setLoading(true);
    try {
      const res = await fetch(`api/residents/${phone}`, { method: 'DELETE' });
      if (res.ok) {
        fetchResidents();
      } else {
        const data = await res.json();
        setError(data.error || '删除失败');
      }
    } catch (err) {
      setError('网络错误，删除失败');
    } finally {
      setLoading(false);
    }
  };

  const changeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminPassword.length < 6) {
      setError('密码长度至少为6位');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newAdminPassword }),
      });
      if (res.ok) {
        setNewAdminPassword('');
        alert('密码修改成功');
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      setError('修改失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminCreds),
      });
      const data = await res.json();
      if (data.success) {
        setIsAdminAuthenticated(true);
        sessionStorage.setItem('jiahong_admin', 'true');
        setAdminCreds({ username: '', password: '' });
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('登录失败');
    } finally {
      setLoading(false);
    }
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('jiahong_admin');
    setView('grid');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^1\d{10}$/.test(phone)) {
      setError('请输入有效的11位手机号');
      return;
    }
    
    setLoading(true);
    try {
      // Fetch latest residents to ensure we have the most up-to-date whitelist
      const res = await fetch('api/residents');
      const data = await res.json();
      setResidents(data);
      
      if (data[phone]) {
        localStorage.setItem('jiahong_phone', phone);
        setIsLoggedIn(true);
        setError(null);
      } else {
        setError('该手机号不在白名单内，请联系管理员');
      }
    } catch (err) {
      setError('网络错误，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = (slot: string) => {
    setCurrentSelection(slot);
  };

  const confirmBooking = async () => {
    if (!currentSelection || !isLoggedIn) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, slot: currentSelection, phone }),
      });
      
      let data;
      const text = await res.text();
      console.log(`Booking response (status ${res.status}):`, text);
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Non-JSON response text:', text);
        throw new Error(`服务器响应格式错误 (${res.status})`);
      }

      if (res.ok && data.success) {
        setSuccessBooking(data.booking);
        setCurrentSelection(null);
        fetchBookings();
      } else {
        setError(data.error || `预定失败 (${res.status})`);
      }
    } catch (err: any) {
      console.error('Booking error:', err);
      setError(err.message === 'Failed to fetch' ? '网络连接失败，请检查网络' : (err.message || '网络错误，请稍后再试'));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('jiahong_phone');
    setIsLoggedIn(false);
    setPhone('');
  };

  const myBookings = useMemo(() => {
    const list: Booking[] = [];
    Object.values(bookings).forEach(daySlots => {
      Object.values(daySlots).forEach(b => {
        if (b.UserPhone === phone && b.Status !== 0) {
          list.push(b);
        }
      });
    });
    return list.sort((a, b) => new Date(a.BookingDate).getTime() - new Date(b.BookingDate).getTime());
  }, [bookings, phone]);

  if (!isLoggedIn && view !== 'admin') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 max-w-[400px] mx-auto">
        <div className="w-full space-y-12">
          <header className="flex flex-col items-center text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <TennisBallIcon />
              <h1 className="text-2xl font-black tracking-tighter">嘉鸿花园网球场预定</h1>
            </div>
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.3em] font-medium">Community Sports Management</p>
          </header>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input
                  type="tel"
                  placeholder="请输入住户手机号"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-b-2 border-gray-100 focus:outline-none focus:border-[#DFFF00] transition-colors text-lg"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={11}
                />
              </div>
              <div className="flex justify-between items-center px-1">
                <p className="text-[10px] text-gray-400">提示：仅限白名单住户登录</p>
                <button 
                  type="button"
                  onClick={() => setView('admin')}
                  className="text-[10px] font-bold text-gray-400 hover:text-black underline underline-offset-4"
                >
                  管理员入口
                </button>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <button
              type="submit"
              className="w-full py-5 bg-[#DFFF00] text-black font-black text-sm uppercase tracking-widest active:scale-[0.98] transition-all shadow-lg shadow-yellow-100"
            >
              验证身份进入
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white max-w-[400px] mx-auto flex flex-col relative pb-24">
      {/* Header */}
      <header className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-20">
        <div className="flex items-center space-x-2">
          <TennisBallIcon />
          <div>
            <h1 className="text-lg font-black tracking-tighter leading-none">嘉鸿花园网球场预定</h1>
            <p className="text-[8px] text-gray-400 uppercase tracking-widest mt-1">Community Sports</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setView(view === 'grid' ? 'my' : 'grid')} className="p-2 text-gray-400 hover:text-black transition-colors">
            {view === 'grid' ? <User className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => setView(view === 'admin' ? 'grid' : 'admin')} 
            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              view === 'admin' 
                ? 'bg-black text-white' 
                : 'bg-[#DFFF00] text-black shadow-sm'
            }`}
          >
            {view === 'admin' ? '退出' : '管理'}
          </button>
        </div>
      </header>

      {view === 'admin' ? (
        !isAdminAuthenticated ? (
          <div className="p-8 space-y-8 flex-1 flex flex-col justify-center">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black tracking-tighter">管理员登录</h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Admin Authorization Required</p>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input
                type="text"
                placeholder="管理员账号"
                className="w-full px-4 py-4 bg-gray-50 border-b-2 border-gray-100 focus:outline-none focus:border-[#DFFF00] transition-colors"
                value={adminCreds.username}
                onChange={(e) => setAdminCreds({ ...adminCreds, username: e.target.value })}
              />
              <input
                type="password"
                placeholder="管理员密码"
                className="w-full px-4 py-4 bg-gray-50 border-b-2 border-gray-100 focus:outline-none focus:border-[#DFFF00] transition-colors"
                value={adminCreds.password}
                onChange={(e) => setAdminCreds({ ...adminCreds, password: e.target.value })}
              />
              <button
                type="submit"
                className="w-full py-5 bg-black text-white font-bold text-xs uppercase tracking-widest"
              >
                验证登录
              </button>
              <button
                type="button"
                onClick={() => setView('grid')}
                className="w-full py-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest"
              >
                返回预约
              </button>
            </form>
          </div>
        ) : (
          <div className="p-6 space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold tracking-tight">管理面板</h2>
              <button onClick={logoutAdmin} className="text-[10px] font-bold text-red-500 uppercase underline">退出登录</button>
            </div>
            <div className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight">修改管理员密码</h2>
              <form onSubmit={changeAdminPassword} className="space-y-3">
                <input
                  type="password"
                  placeholder="新密码 (至少6位)"
                  className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 focus:outline-none focus:border-black text-sm"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                />
                <button
                  type="submit"
                  className="w-full py-4 bg-black text-white font-bold text-xs uppercase tracking-widest"
                >
                  确认修改
                </button>
              </form>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight">添加新住户</h2>
            <form onSubmit={addResident} className="space-y-3">
              <input
                type="tel"
                placeholder="手机号 (11位)"
                className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 focus:outline-none focus:border-black text-sm"
                value={newResident.phone}
                onChange={(e) => setNewResident({ ...newResident, phone: e.target.value })}
                maxLength={11}
              />
              <input
                type="text"
                placeholder="房号 (如: 1-101)"
                className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 focus:outline-none focus:border-black text-sm"
                value={newResident.room}
                onChange={(e) => setNewResident({ ...newResident, room: e.target.value })}
              />
              <button
                type="submit"
                className="w-full py-4 bg-black text-white font-bold text-xs uppercase tracking-widest"
              >
                确认添加
              </button>
            </form>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">白名单列表 ({Object.keys(residents).length})</h2>
            <div className="space-y-2">
              {Object.entries(residents).map(([p, r]) => (
                <div key={p} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-bold text-sm">{r}</p>
                    <p className="text-xs text-gray-400">{p}</p>
                  </div>
                  <button
                    onClick={() => deleteResident(p)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        )
      ) : view === 'grid' ? (
        <>
          <div className="px-6 py-2 bg-yellow-50 border-b border-yellow-100">
            <p className="text-[10px] text-yellow-700 font-bold tracking-widest uppercase">
              Notice: 仅开放本周内预约 (单户每日限约 2 小时)
            </p>
          </div>
          {/* Date Nav */}
          <nav className="flex overflow-x-auto p-4 space-x-3 border-b border-gray-50 no-scrollbar sticky top-[105px] bg-white z-10">
            {dates.map((date, i) => {
              const d = new Date(date);
              const isSelected = selectedDate === date;
              const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
              let label = dayNames[d.getDay()];
              if (i === 0) label = "今天";
              if (i === 1) label = "明天";
              
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 px-6 py-2 rounded-full text-xs font-bold transition-all ${
                    isSelected ? 'bg-black text-white' : 'border border-gray-200 text-gray-400'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Slots Grid */}
          <main className="p-4 grid grid-cols-2 gap-3">
            {SLOTS.map((slot) => {
              const booking = bookings[selectedDate]?.[slot];
              const isReserved = booking && booking.Status !== 0;
              const isMine = booking?.UserPhone === phone;
              const isSelected = currentSelection === slot;

              return (
                <div
                  key={slot}
                  onClick={() => !isReserved && handleBook(slot)}
                  className={`p-5 rounded-sm flex justify-between items-center transition-all active:scale-95 cursor-pointer ${
                    isReserved
                      ? isMine 
                        ? 'bg-[#DFFF00] text-black' 
                        : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      : isSelected
                        ? 'border-2 border-[#DFFF00] bg-yellow-50'
                        : 'border border-gray-100 text-gray-700'
                  }`}
                >
                  <span className="font-mono font-bold text-sm">{slot}</span>
                  <span className={`text-[9px] uppercase font-bold tracking-tighter ${isReserved ? 'opacity-80' : 'opacity-40'}`}>
                    {isReserved ? (isMine ? '您的' : '已满') : '可约'}
                  </span>
                </div>
              );
            })}
          </main>
          
          {/* Convention Trigger */}
          <div className="pt-8 pb-4 text-center">
            <button 
              onClick={() => setShowConvention(true)}
              className="text-[11px] font-bold text-gray-300 hover:text-black uppercase tracking-[0.2em] transition-colors"
            >
              小区网球爱好者自律公约
            </button>
          </div>
        </>
      ) : (
        <div className="p-8 space-y-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('grid')} className="p-2 -ml-2"><ChevronLeft className="w-6 h-6" /></button>
            <h2 className="text-2xl font-bold tracking-tight">我的预定流水</h2>
          </div>
          
          {myBookings.length === 0 ? (
            <div className="py-20 text-center text-gray-400 text-sm">暂无有效预定</div>
          ) : (
            <div className="space-y-4">
              {myBookings.map((b) => (
                <div key={b.BookingID} className="p-6 border border-gray-100 rounded-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xl font-bold">{b.BookingDate}</p>
                      <p className="text-sm text-black font-bold bg-[#DFFF00] px-2 inline-block">{b.TimeSlot}</p>
                    </div>
                    <div className="text-[9px] font-mono text-gray-300 uppercase tracking-widest">ID: {b.BookingID}</div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Status: 已锁定</span>
                    <button 
                      onClick={async () => {
                        if (confirm('确定取消该时段的资产锁定吗？')) {
                          const res = await fetch('api/cancel', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ date: b.BookingDate, slot: b.TimeSlot, phone }),
                          });
                          if (res.ok) fetchBookings();
                        }
                      }}
                      className="text-[10px] text-gray-300 hover:text-red-500 font-bold uppercase tracking-widest"
                    >
                      取消锁定
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-12 border-t border-gray-100">
            <button onClick={logout} className="text-xs text-gray-400 font-bold uppercase tracking-widest hover:text-black">退出登录</button>
          </div>
        </div>
      )}

      {/* Booking Dock */}
      <AnimatePresence>
        {currentSelection && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed bottom-0 left-0 right-0 p-8 bg-white border-t border-gray-100 shadow-2xl z-30 max-w-[400px] mx-auto"
          >
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">已选时段</p>
                <p className="text-2xl font-bold text-black tracking-tighter">
                  {currentSelection} - {parseInt(currentSelection)+1}:00
                </p>
              </div>
              <button 
                onClick={confirmBooking}
                disabled={loading}
                className="px-10 py-4 bg-[#DFFF00] text-black font-bold text-xs uppercase tracking-widest active:opacity-80 disabled:opacity-50"
              >
                {loading ? '处理中...' : '确认锁定'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {successBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-8 max-w-[400px] mx-auto"
          >
            <div className="w-full space-y-12 text-center">
              <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center mx-auto">
                <TennisBallIcon />
              </div>
              <div className="space-y-2">
                <h2 className="text-4xl font-bold tracking-tighter">资产锁定成功</h2>
                <p className="text-[10px] text-gray-400 uppercase tracking-[0.3em]">Jiahong Garden Entry Pass</p>
              </div>
              
              <div className="grid grid-cols-2 gap-8 text-left border-y border-gray-100 py-8">
                <div>
                  <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">Date</p>
                  <p className="font-bold">{successBooking.BookingDate}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">Slot</p>
                  <p className="font-bold">{successBooking.TimeSlot}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">Room</p>
                  <p className="font-bold">{successBooking.RoomNumber}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">ID</p>
                  <p className="font-bold font-mono">{successBooking.BookingID}</p>
                </div>
              </div>

              <button
                onClick={() => setSuccessBooking(null)}
                className="w-full py-5 bg-black text-white font-bold text-xs uppercase tracking-widest"
              >
                返回首页
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-4 right-4 bg-black text-white p-4 text-xs font-bold uppercase tracking-widest text-center z-[60] max-w-[368px] mx-auto"
          >
            {error}
            <button onClick={() => setError(null)} className="absolute right-4 top-1/2 -translate-y-1/2"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Convention Modal */}
      <AnimatePresence>
        {showConvention && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-[375px] h-[85vh] sm:h-auto sm:max-h-[80vh] rounded-t-[32px] sm:rounded-3xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div className="flex items-center space-x-3">
                  <TennisBallIcon />
                  <h2 className="text-lg font-bold tracking-tight">自律公约</h2>
                </div>
                <button onClick={() => setShowConvention(false)} className="p-2 text-gray-400 hover:text-red-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-gray-600 leading-relaxed no-scrollbar">
                <p className="font-medium text-gray-900">
                  为营造公平、友爱、持久的网球运动氛围，共同维护我们珍贵的公共场地，经小区网球爱好者共同商议，制定本自律公约。凡加入本小区业主网球群的成员，均视为已知悉、理解并自愿遵守本公约全部内容。
                </p>

                <section className="space-y-3">
                  <h3 className="font-bold text-gray-900 border-l-4 border-[#DFFF00] pl-3">第一章 总则</h3>
                  <div className="space-y-2">
                    <p><span className="font-bold text-gray-800">第一条 公平开放：</span>本网球场是全体业主的共享资产。我们承诺秉承公平原则，对所有业主开放，反对任何形式的独占与排他行为。</p>
                    <p><span className="font-bold text-gray-800">第二条 爱护公产：</span>场地设施属于全体业主的共同财产。每位参与者都应像爱护自家物品一样加以爱惜，这是我们的共同责任。</p>
                    <p><span className="font-bold text-gray-800">第三条 友好协商：</span>倡导文明、礼让、和谐的网球文化。遇有使用时间、方式等任何争议，应优先通过友好沟通与协商解决。</p>
                    <p><span className="font-bold text-gray-800">第四条 非营利性：</span>本场地及爱好者活动纯属业主公益健身与兴趣交流，严禁任何个人或团体利用场地开展教学、培训、比赛等任何形式的商业性经营活动。</p>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="font-bold text-gray-900 border-l-4 border-[#DFFF00] pl-3">第二章 预约与使用制度</h3>
                  <div className="space-y-2">
                    <p><span className="font-bold text-gray-800">第五条 预约优先，灵活共享：</span></p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>预约制：为高效利用场地并兼顾计划性，实行预约优先使用制度。具体预约方式与规则由爱好者群体内部友好协商确定。</li>
                      <li>定期磋商：为适应全体业主的作息变化，每年6月及12月，我们将重新共同磋商未来半年的高峰时段预约安排，力求公平合理。</li>
                      <li>空余利用：非预约时段，场地遵循“先到先得”原则开放使用。</li>
                      <li>守信高效：预约后如因故无法使用，必须及时在群内或向预约协调人说明，以便释放时段给其他邻居。养成守信习惯，最大化提升场地使用效率。</li>
                    </ul>
                    <p><span className="font-bold text-gray-800">第六条 弹性与礼让：</span>在预约框架下，我们依然倡导“新人友好”与互相体谅的精神。鼓励成员在时间安排上主动进行友好协商与适当让渡，积极欢迎新伙伴参与。</p>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="font-bold text-gray-900 border-l-4 border-[#DFFF00] pl-3">第三章 共同维护倡议</h3>
                  <div className="space-y-2">
                    <p><span className="font-bold text-gray-800">第七条 日常维护：</span>鼓励有经济能力与闲暇的热心爱好者，或集体商议委托可靠人员，进行基础的日常清洁、检查，延缓场地老化。</p>
                    <p><span className="font-bold text-gray-800">第八条 修复倡议：</span>我们倡议，在条件允许时，爱好者可自愿、量力出资，对局部损坏进行及时修复。所有倡议性集资与支出应公开透明，自愿参与。</p>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="font-bold text-gray-900 border-l-4 border-[#DFFF00] pl-3">第四章 安全与责任</h3>
                  <div className="space-y-2">
                    <p><span className="font-bold text-gray-800">第九条 健康自负：</span>网球运动具有竞技性与一定风险。参与者必须对自身健康状况负责，活动前充分热身，量力而行。活动期间任何人身伤害、疾病突发等意外后果，均需由参与者个人承担全部责任。</p>
                    <p><span className="font-bold text-gray-800">第十条 损害赔偿：</span>任何因故意或重大过失损坏场地、网柱、围网等设施的行为，责任人必须承担全部修复或赔偿费用。</p>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="font-bold text-gray-900 border-l-4 border-[#DFFF00] pl-3">第五章 附则</h3>
                  <p>本公约旨在依靠爱好者的自觉与共识共同践行。让我们以球会友，以约共守，携手让这片场地持续充满活力与欢笑！</p>
                </section>

                <div className="pt-6 border-t border-gray-100 text-right italic text-xs text-gray-400">
                  倡议发起：小区网球爱好者代表
                </div>
              </div>

              <div className="p-6 bg-gray-50">
                <button
                  onClick={() => setShowConvention(false)}
                  className="w-full py-4 bg-[#DFFF00] text-black font-bold rounded-xl active:scale-95 transition-transform"
                >
                  我已阅读并知悉
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="fixed inset-0 bg-white/40 backdrop-blur-[2px] z-[60] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#DFFF00] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
