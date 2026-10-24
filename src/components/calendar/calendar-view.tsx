"use client";

import React, { useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

interface CalendarViewProps {
  events: any[];
  onEventClick: (info: any) => void;
  onSelect: (selectInfo: any) => void;
  onEventDrop: (dropInfo: any) => void;
}

export default function CalendarView({
  events,
  onEventClick,
  onSelect,
  onEventDrop,
}: CalendarViewProps) {
  const calendarRef = useRef<any>(null);

  useEffect(() => {
    if (calendarRef.current) {
      calendarRef.current.getApi?.()?.updateSize?.();
    }

    const setAriaLabels = () => {
      document.querySelectorAll(".fc-prev-button").forEach((btn) => {
        btn.setAttribute("aria-label", "Previous - Go to previous date range");
      });
      document.querySelectorAll(".fc-next-button").forEach((btn) => {
        btn.setAttribute("aria-label", "Next - Go to next date range");
      });
      document.querySelectorAll(".fc-today-button").forEach((btn) => {
        btn.setAttribute("aria-label", "Today - Go to current date");
      });
    };
    setAriaLabels();
    const timeout = setTimeout(setAriaLabels, 200);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <FullCalendar
      ref={calendarRef}
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="timeGridDay"
      headerToolbar={{
        left: "prev,next today",
        center: "title",
        right: "timeGridDay,timeGridWeek,dayGridMonth",
      }}
      buttonText={{
        today: "Today",
        month: "Month",
        week: "Week",
        day: "Day",
        prev: "Previous",
        next: "Next",
      }}
      slotMinTime="08:00:00"
      slotMaxTime="20:30:00"
      slotDuration="00:30:00"
      allDaySlot={false}
      nowIndicator={true}
      editable={true}
      selectable={true}
      selectMirror={true}
      events={events}
      eventClick={onEventClick}
      select={onSelect}
      eventDrop={onEventDrop}
      height="auto"
    />
  );
}
