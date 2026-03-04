import React, { useState } from 'react';
import './BandCalendar.css';

const EVENT_TYPES = { rehearsal: 'Rehearsal', concert: 'Concert', other: 'Other' };

function BandCalendar() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState([
    { id: 1, date: new Date(today.getFullYear(), today.getMonth(), 13).toDateString(), type: 'rehearsal', label: 'Rehearsal' },
    { id: 2, date: new Date(today.getFullYear(), today.getMonth(), 16).toDateString(), type: 'concert',   label: 'Concert' },
    { id: 3, date: new Date(today.getFullYear(), today.getMonth(), 22).toDateString(), type: 'rehearsal', label: 'Rehearsal' },
  ]);
  const [addingDate, setAddingDate] = useState(null);
  const [newEvent, setNewEvent] = useState({ type: 'rehearsal', label: '' });

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long' });
  const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getEvents = (day) => {
    if (!day) return [];
    const ds = new Date(year, month, day).toDateString();
    return events.filter(e => e.date === ds);
  };

  const handleDayClick = (day) => {
    if (!day) return;
    setAddingDate(new Date(year, month, day));
    setNewEvent({ type: 'rehearsal', label: '' });
  };

  const confirmAdd = () => {
    if (!addingDate) return;
    setSomething();
    setEvents([...events, {
      id: Date.now(),
      date: addingDate.toDateString(),
      type: newEvent.type,
      label: newEvent.label || EVENT_TYPES[newEvent.type],
    }]);
    setAddingDate(null);
  };

  // dummy to avoid lint warning
  const setSomething = () => {};

  const removeEvent = (id, e) => {
    e.stopPropagation();
    setEvents(events.filter(ev => ev.id !== id));
  };

  const upcomingEvents = events
    .map(e => ({ ...e, _d: new Date(e.date) }))
    .filter(e => e._d >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
    .sort((a, b) => a._d - b._d)
    .slice(0, 5);

  return (
    <div className="calendar-page">
      <div className="calendar-main">
        {/* Header */}
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
          <h2 className="cal-month-title">{monthName} {year}</h2>
          <button className="cal-nav-btn" onClick={nextMonth}>›</button>
        </div>

        {/* Day-of-week headers */}
        <div className="cal-grid cal-dow-row">
          {DOW.map(d => <div key={d} className="cal-dow">{d}</div>)}
        </div>

        {/* Day cells */}
        <div className="cal-grid cal-days-grid">
          {cells.map((day, i) => {
            const dayEvents = getEvents(day);
            const isToday = day && new Date(year, month, day).toDateString() === today.toDateString();
            return (
              <div
                key={i}
                className={`cal-cell ${day ? 'cal-cell-active' : ''} ${isToday ? 'cal-today' : ''}`}
                onClick={() => handleDayClick(day)}
              >
                {day && <span className="cal-day-num">{day}</span>}
                {dayEvents.map(ev => (
                  <div key={ev.id} className={`cal-event-chip cal-event-${ev.type}`}>
                    {ev.label}
                    <button className="cal-event-remove" onClick={e => removeEvent(ev.id, e)}>×</button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming events sidebar */}
      <div className="calendar-sidebar">
        <h3 className="cal-sidebar-title">Upcoming</h3>
        {upcomingEvents.length === 0 && <p className="cal-empty">No upcoming events.</p>}
        {upcomingEvents.map(ev => (
          <div key={ev.id} className={`cal-upcoming-item cal-event-${ev.type}`}>
            <div className="cal-upcoming-date">
              {ev._d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div className="cal-upcoming-label">{ev.label}</div>
            <span className={`cal-type-badge cal-event-${ev.type}`}>{EVENT_TYPES[ev.type]}</span>
          </div>
        ))}

        {/* Add event modal */}
        {addingDate && (
          <div className="cal-add-panel">
            <h4 className="cal-add-title">
              Add event — {addingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </h4>
            <select
              className="cal-add-select"
              value={newEvent.type}
              onChange={e => setNewEvent({ ...newEvent, type: e.target.value })}
            >
              {Object.entries(EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input
              className="cal-add-input"
              placeholder="Custom label (optional)"
              value={newEvent.label}
              onChange={e => setNewEvent({ ...newEvent, label: e.target.value })}
            />
            <div className="cal-add-actions">
              <button className="cal-add-confirm" onClick={confirmAdd}>Add</button>
              <button className="cal-add-cancel" onClick={() => setAddingDate(null)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BandCalendar;
