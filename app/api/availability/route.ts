import { NextRequest, NextResponse } from 'next/server';
import { getCalendar } from '@/app/lib/google';
import { dayBounds, generateSlots, fmtHHmmLocal, parseZoned } from '@/app/lib/datetime';
import { WORKING_HOURS } from '@/app/lib/hours';
import { addMinutes } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get('date');           // YYYY-MM-DD
    const duration = Number(req.nextUrl.searchParams.get('duration') || '30'); // 30|60

    if (!date || (duration !== 30 && duration !== 60)) {
      return NextResponse.json({ slots: [], error: 'invalid params' }, { status: 400 });
    }

    const dow = new Date(date).getDay();
    const hours = WORKING_HOURS[dow];
    if (!hours) return NextResponse.json({ slots: [] }); // почивен ден

    const cal = getCalendar();
    const { timeMin, timeMax } = dayBounds(date);

    const fb = await cal.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: 'Europe/Sofia',
        items: [{ id: process.env.BOOKING_CALENDAR_ID! }],
      },
    });

    const busy = fb.data.calendars?.[process.env.BOOKING_CALENDAR_ID!]?.busy || [];

    // всички кандидати през 30 мин
    const candidates = Array.from(generateSlots(date, hours.start, hours.end, 30));

    // край на работния ден като UTC (за да не предлагаме 18:30 → 19:30 ако краят е 19:00)
    const workEndUtc = parseZoned(date, hours.end);

    // функция дали интервал [start, end) се застъпва с busy
    function overlapsAny(startUtc: Date, endUtc: Date) {
      return busy.some((b) => {
        const bStart = new Date(b.start!);
        const bEnd = new Date(b.end!);
        // правилна логика за застъпване: start < bEnd && end > bStart
        return startUtc < bEnd && endUtc > bStart;
      });
    }

    // за дадена продължителност – кои стартове са валидни
    const slots = candidates.map((startUtc) => {
      const endUtc = addMinutes(startUtc, duration);

      // 1) целият интервал трябва да попада в работното време
      const fitsInWorkingHours = endUtc <= workEndUtc;

      // 2) да няма застъпване с заето от календара
      const free = fitsInWorkingHours && !overlapsAny(startUtc, endUtc);

      return { time: fmtHHmmLocal(startUtc), available: free };
    });

    return NextResponse.json({ slots });
  } catch (e: unknown) {
    console.error('availability error:', e);
    return NextResponse.json({ slots: [], error: 'server error' }, { status: 500 });
  }
}
