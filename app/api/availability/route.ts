// app/api/availability/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCalendar } from "@/app/lib/google";
import { dayBounds, generateSlots, fmtHHmmLocal, parseZoned } from "@/app/lib/datetime";
import { WORKING_HOURS } from "@/app/lib/hours";
import { addMinutes } from "date-fns";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams;
  const date = qs.get("date"); // YYYY-MM-DD
  const duration = Number(qs.get("duration") || "30"); // 30|60

  try {
    if (!date || (duration !== 30 && duration !== 60)) {
      return NextResponse.json({ slots: [], error: "invalid params" }, { status: 400 });
    }

    const calendarId = process.env.BOOKING_CALENDAR_ID;
    if (!calendarId) {
      return NextResponse.json({ slots: [], error: "BOOKING_CALENDAR_ID is missing" }, { status: 500 });
    }

    const hours = WORKING_HOURS[new Date(parseZoned(date, "12:00")).getDay()];
    if (!hours) return NextResponse.json({ slots: [] }); // почивен ден

    const cal = getCalendar();
    const { timeMin, timeMax } = dayBounds(date);

    const fb = await cal.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: "Europe/Sofia",
        items: [{ id: calendarId }],
      },
    });

    const busy = fb.data.calendars?.[calendarId]?.busy || [];

    const candidates = Array.from(generateSlots(date, hours.start, hours.end, 30));
    const workEndUtc = parseZoned(date, hours.end);

    function overlapsAny(startUtc: Date, endUtc: Date) {
      return busy.some((b) => {
        const bStart = new Date(b.start!);
        const bEnd = new Date(b.end!);
        return startUtc < bEnd && endUtc > bStart;
      });
    }

    const slots = candidates.map((startUtc) => {
      const endUtc = addMinutes(startUtc, duration);
      const fitsInWorkingHours = endUtc <= workEndUtc;
      const free = fitsInWorkingHours && !overlapsAny(startUtc, endUtc);
      return { time: fmtHHmmLocal(startUtc), available: free };
    });

    return NextResponse.json({ slots });
  } catch (e: any) {
    // извадка на пълното съобщение от Google
    const g = e?.response?.data || e;
    const msg =
      g?.error?.message ||
      e?.message ||
      "server error";
    console.error("availability error:", JSON.stringify(g, null, 2));
    return NextResponse.json({ slots: [], error: msg }, { status: 500 });
  }
}
