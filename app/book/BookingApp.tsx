// app/book/BookingApp.tsx
"use client";

import * as React from "react";
import Calendar from "@/app/components/Calendar";
import { fmtDateHeader } from "@/app/lib/ui";

type Slot = { time: string; available: boolean };
type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  procedure: string;
  symptoms?: string;
  duration: 30 | 60;
};

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fmtDateBG(d: Date) {
  return d.toLocaleDateString("bg-BG", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function BookingApp() {
  const [date, setDate] = React.useState<Date>(new Date());
  const [duration, setDuration] = React.useState<30 | 60>(30);
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [note, setNote] = React.useState<string | null>(null);
  const [hourAvailable, setHourAvailable] = React.useState<boolean>(true);

  const [form, setForm] = React.useState<FormData>({
    firstName: "", lastName: "", email: "", phone: "", procedure: "", duration: 30
  });

  const formRef = React.useRef<HTMLDivElement | null>(null);
  const scrollToForm = React.useCallback(() => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setSelectedTime(null);
    setNote(null);
    try {
      const d = ymd(date);
      const res = await fetch(`/api/availability?date=${d}&duration=${duration}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const list: Slot[] = Array.isArray(data.slots) ? data.slots : [];

      if (duration === 60) {
        const anyHour = list.some(s => s.available);
        if (!anyHour) {
          setHourAvailable(false);
          setNote("Няма свободен цял час за тази дата. Показваме опции по 30 мин.");
          setLoading(false);
          setDuration(30);
          return;
        } else setHourAvailable(true);
      } else setHourAvailable(true);

      setSlots(list);
    } catch {
      setSlots([]);
    } finally { setLoading(false); }
  }, [date, duration]);

  React.useEffect(() => { load(); }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTime) { setError("Моля, изберете час"); return; }
    setError(null); setSuccess(null); setLoading(true);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: ymd(date), time: selectedTime, duration, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Грешка при запис.");
      setSuccess("Успешно записахте час! Проверете имейла си за потвърждение.");
      setSelectedTime(null);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Заглавие */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Запазване на час</h1>
          <p className="text-gray-500 mt-1">Изберете дата и час за вашата визита</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Лява карта – Календар */}
          <div className="rounded-2xl border shadow-sm bg-white">
            <div className="flex items-center gap-2 px-6 pt-5 pb-3">
              <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-600">📅</div>
              <h2 className="text-lg font-semibold text-gray-900">Изберете дата</h2>
            </div>
            <div className="px-4 pb-5">
              <Calendar value={date} onChange={(d)=>setDate(d)} />
            </div>
          </div>

          {/* Дясна карта – Свободни часове */}
          <div className="rounded-2xl border shadow-sm bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-600">⏰</div>
              <h2 className="text-lg font-semibold text-gray-900">Свободни часове за {fmtDateBG(date)}</h2>
            </div>

            {/* Продължителност */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={()=>setDuration(30)}
                className={`px-3 py-1 rounded-full border text-sm ${duration===30 ? "bg-sky-600 text-white border-sky-600" : "bg-white text-gray-700 hover:bg-gray-50"}`}
              >30 мин</button>
              <button
                onClick={()=> hourAvailable && setDuration(60)}
                disabled={!hourAvailable}
                title={!hourAvailable ? "Няма свободен 60-минутен интервал за тази дата" : ""}
                className={`px-3 py-1 rounded-full border text-sm ${duration===60 ? "bg-sky-600 text-white border-sky-600" : "bg-white text-gray-700 hover:bg-gray-50"} ${!hourAvailable ? "opacity-50 cursor-not-allowed" : ""}`}
              >60 мин</button>
            </div>

            {note && <div className="text-xs text-gray-500 mb-3">{note}</div>}

            {/* Слотове – скролируем списък */}
            <div className="max-h-[420px] overflow-y-auto pr-1">
              {loading && <div className="text-sm text-gray-600 p-2">Зареждане…</div>}
              {!loading && slots.length === 0 && <div className="text-sm text-gray-500 p-2">Няма свободни часове за тази дата.</div>}
              {!loading && slots.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {slots.map(s => {
                    const selected = selectedTime === s.time;
                    const available = s.available;
                    return (
                      <button
                        key={s.time}
                        disabled={!available}
                        onClick={()=>setSelectedTime(s.time)}
                        className={[
                          "h-10 rounded-md border text-sm text-center flex items-center justify-center cursor-pointer transition",
                          available
                            ? (selected ? "bg-sky-600 text-white border-sky-600" : "bg-white text-gray-800 hover:bg-gray-50")
                            : "bg-gray-200 text-gray-500 cursor-not-allowed"
                        ].join(" ")}
                      >
                        {s.time}
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedTime && (
                <div className="mt-4 rounded-lg border bg-sky-50 p-3">
                  <div className="text-sm text-gray-700">
                    Избран час: <b>{fmtDateHeader(date)} – {selectedTime} ({duration} мин)</b>
                  </div>
                  <div className="mt-2">
                    <button onClick={scrollToForm} className="inline-flex items-center gap-2 px-4 h-9 rounded-md bg-sky-600 text-white text-sm hover:bg-sky-700">
                      Продължи ↓
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Форма */}
            <div ref={formRef} className="mt-6">
              {selectedTime && (
                <form onSubmit={submit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input className="border rounded-md p-2" placeholder="Име" required
                           value={form.firstName} onChange={e=>setForm({...form, firstName:e.target.value})}/>
                    <input className="border rounded-md p-2" placeholder="Фамилия" required
                           value={form.lastName} onChange={e=>setForm({...form, lastName:e.target.value})}/>
                  </div>
                  <input className="border rounded-md p-2 w-full" placeholder="Имейл" type="email" required
                         value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
                  <input className="border rounded-md p-2 w-full" placeholder="Телефон" required
                         value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})}/>
                  <input className="border rounded-md p-2 w-full" placeholder="Процедура" required
                         value={form.procedure} onChange={e=>setForm({...form, procedure:e.target.value})}/>
                  <textarea className="border rounded-md p-2 w-full h-24" placeholder="Симптоми (по желание)"
                            value={form.symptoms||""} onChange={e=>setForm({...form, symptoms:e.target.value})}/>
                  {error && <div className="text-sm text-red-600">{error}</div>}
                  {success && <div className="text-sm text-green-600">{success}</div>}
                  <button className="w-full h-10 rounded-md bg-sky-600 text-white hover:bg-sky-700" type="submit" disabled={loading}>
                    {loading ? "Записване…" : "Запази"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
