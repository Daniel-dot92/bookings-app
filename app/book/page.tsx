// app/book/page.tsx
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
  // duration махнато от формата
};

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function BookPage() {
  const [date, setDate] = React.useState<Date>(new Date());
  const [duration, setDuration] = React.useState<30 | 60>(30); // отделно състояние
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // за съобщения и деактивиране на бутона 60 мин, ако няма нито един цял час свободен
  const [note, setNote] = React.useState<string | null>(null);
  const [hourAvailable, setHourAvailable] = React.useState<boolean>(true);

  const [form, setForm] = React.useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    procedure: "",
    symptoms: "",
  });

  // Зарежда слотовете; ако за 60 мин няма нито един свободен → падаме на 30 мин
  const load = React.useCallback(async () => {
    setLoading(true);
    setSelectedTime(null);
    setNote(null);

    try {
      const d = ymd(date);
      const res = await fetch(`/api/availability?date=${d}&duration=${duration}`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const list: Slot[] = Array.isArray(data.slots) ? data.slots : [];

      if (duration === 60) {
        const anyHour = list.some((s) => s.available);
        if (!anyHour) {
          setHourAvailable(false);
          setNote("Няма свободен цял час за тази дата. Показваме опции по 30 мин.");
          setLoading(false);
          setDuration(30);
          return;
        } else {
          setHourAvailable(true);
        }
      } else {
        setHourAvailable(true);
      }

      setSlots(list);
    } catch (err: unknown) {
      console.error("availability error:", err);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [date, duration]);

  React.useEffect(() => {
    load();
  }, [load]);

  // submit
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedTime) {
      setError("Моля, изберете час");
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: ymd(date),
          time: selectedTime,
          duration, // подаваме само веднъж от отделния state
          ...form,  // тук вече няма duration вътре
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Грешка при запис.");
      setSuccess("Успешно записахте час! Проверете имейла си за потвърждение.");
      setSelectedTime(null);
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Възникна грешка при запис.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-semibold mb-6">Select a Date &amp; Time</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Календар вляво */}
          <div className="md:col-span-2">
            <Calendar value={date} onChange={(d) => setDate(d)} />
            <div className="text-xs text-gray-500 mt-3">
              Time zone — {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </div>
          </div>

          {/* Слотове вдясно */}
          <div className="rounded-2xl border shadow-sm p-4 bg-white">
            <div className="text-sm text-gray-500">
              {date.toLocaleDateString("en-US", { weekday: "long" })},
            </div>
            <div className="text-lg font-semibold mb-3">{fmtDateHeader(date)}</div>

            {/* Продължителност */}
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setDuration(30)}
                className={`px-3 py-1 rounded-full border ${
                  duration === 30 ? "bg-black text-white" : "bg-white hover:bg-gray-50"
                }`}
              >
                30min
              </button>

              <button
                onClick={() => hourAvailable && setDuration(60)}
                disabled={!hourAvailable}
                className={`px-3 py-1 rounded-full border ${
                  duration === 60 ? "bg-black text-white" : "bg-white hover:bg-gray-50"
                } ${!hourAvailable ? "opacity-50 cursor-not-allowed" : ""}`}
                title={!hourAvailable ? "Няма свободен 60-минутен интервал за тази дата" : ""}
              >
                60min
              </button>
            </div>

            {note && <div className="text-xs text-gray-500 mb-3">{note}</div>}

            {loading && <div className="text-sm">Loading…</div>}
            {!loading && (
              <div className="flex flex-col gap-2">
                {slots.length === 0 && (
                  <div className="text-sm text-gray-500">No availability this day.</div>
                )}
                {slots.map((s) => (
                  <button
                    key={s.time}
                    disabled={!s.available}
                    onClick={() => setSelectedTime(s.time)}
                    className={`h-10 rounded-lg border text-sm text-left px-4
                      ${
                        !s.available
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : selectedTime === s.time
                          ? "bg-black text-white"
                          : "bg-white hover:bg-gray-50"
                      }`}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            )}

            {selectedTime && (
              <form onSubmit={submit} className="mt-5 space-y-2">
                <div className="text-sm text-gray-600">
                  Selected: <b>{fmtDateHeader(date)}</b> at <b>{selectedTime}</b> ({duration} min)
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="border rounded p-2"
                    placeholder="Име"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                  <input
                    className="border rounded p-2"
                    placeholder="Фамилия"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
                <input
                  className="border rounded p-2 w-full"
                  placeholder="Имейл"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <input
                  className="border rounded p-2 w-full"
                  placeholder="Телефон"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <input
                  className="border rounded p-2 w-full"
                  placeholder="Процедура"
                  required
                  value={form.procedure}
                  onChange={(e) => setForm({ ...form, procedure: e.target.value })}
                />
                <textarea
                  className="border rounded p-2 w-full h-24"
                  placeholder="Симптоми (по желание)"
                  value={form.symptoms || ""}
                  onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
                />

                {error && <div className="text-sm text-red-600">{error}</div>}
                {success && <div className="text-sm text-green-600">{success}</div>}

                {/* Honeypot – скрито поле срещу ботове (по желание) */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  style={{ position: "absolute", left: "-5000px", height: 0, width: 0, opacity: 0 }}
                  aria-hidden="true"
                />

                <button
                  className="w-full h-10 rounded-lg bg-black text-white hover:opacity-90"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Записване…" : "Запази"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
