import React, { useMemo, useState } from "react";

const pad = (n) => n.toString().padStart(2, "0");
const toIso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const buildDays = (anchor) => {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
  return cells;
};

const DatePills = ({ dates }) => {
  if (!dates.length) return <span className="text-slate-500">Sin dias</span>;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {dates.map((d) => (
        <span key={d} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-100">
          {d}
        </span>
      ))}
    </div>
  );
};

const VacationCalendar = ({ title, subtitle, selectedDates = [], onChange }) => {
  const [viewDate, setViewDate] = useState(() => new Date());
  const selectedSet = useMemo(() => new Set(selectedDates), [selectedDates]);
  const days = useMemo(() => buildDays(viewDate), [viewDate]);
  const monthLabel = viewDate.toLocaleString("es-ES", { month: "long", year: "numeric" });

  const toggleDay = (day) => {
    const iso = toIso(day);
    const next = new Set(selectedSet);
    if (next.has(iso)) next.delete(iso);
    else next.add(iso);
    const sorted = Array.from(next).sort();
    onChange(sorted);
  };

  const changeMonth = (delta) => {
    const next = new Date(viewDate);
    next.setMonth(viewDate.getMonth() + delta);
    setViewDate(next);
  };

  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brand-200">{title}</p>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          <p className="text-sm text-slate-300 mt-1">{selectedDates.length} dias marcados</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button type="button" className="btn px-2 py-1 text-xs" onClick={() => changeMonth(-1)} aria-label="Mes anterior">{"<"}</button>
          <span className="text-slate-100 font-semibold capitalize min-w-[120px] text-center">{monthLabel}</span>
          <button type="button" className="btn px-2 py-1 text-xs" onClick={() => changeMonth(1)} aria-label="Mes siguiente">{">"}</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-400">
        {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
          <span key={d} className="py-1">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {days.map((day, idx) => {
          if (!day) return <span key={`empty-${idx}`} className="py-2" />;
          const iso = toIso(day);
          const active = selectedSet.has(iso);
          return (
            <button
              type="button"
              key={iso}
              onClick={() => toggleDay(day)}
              className={`py-2 rounded-lg border text-sm transition ${
                active
                  ? "bg-brand-600/30 border-brand-500/60 text-white"
                  : "bg-white/5 border-white/10 text-slate-200 hover:border-brand-400/40 hover:text-white"
              }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      <DatePills dates={selectedDates} />
    </div>
  );
};

export default VacationCalendar;
