import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3 } from 'lucide-react';

const pad = (value) => String(value).padStart(2, '0');
const toISO = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const today = new Date();
today.setHours(0, 0, 0, 0);

// Параметры рабочего времени приходят из Telegram-бота в URL:
// ?work_start=12:00&work_end=21:00&timezone=Europe/Moscow
// Поддерживаются также значения часов без минут: work_start=12&work_end=21.
function parseClock(value, fallback) {
  if (!value) return fallback;
  const match = String(value).trim().match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  if (hours > 23 || minutes > 59) return fallback;
  return hours * 60 + minutes;
}

const urlParams = new URLSearchParams(window.location.search);
const workStart = parseClock(urlParams.get('work_start'), 9 * 60);
const workEnd = parseClock(urlParams.get('work_end'), 17 * 60);
const timezone = urlParams.get('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

function makeSlots(start, end) {
  if (end <= start) return [];
  const result = [];
  // Длительность демонстрационного слота — 1 час. Последний слот
  // начинается не позднее времени окончания рабочего интервала.
  for (let minutes = start; minutes + 60 <= end; minutes += 60) {
    result.push(`${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`);
  }
  return result;
}

// Временные демонстрационные занятые слоты. Позже заменим данными API.
const closedSlots = {
  [toISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1))]: ['13:00', '14:00', '15:00'],
  [toISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3))]: ['12:00', '13:00', '16:00'],
  [toISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5))]: ['12:00', '13:00', '14:00', '15:00', '16:00'],
};

const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function App() {
  const tg = window.Telegram?.WebApp;
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(toISO(today));
  const [selectedTime, setSelectedTime] = useState('');

  useEffect(() => {
    tg?.ready();
    tg?.expand();
  }, [tg]);

  const slots = useMemo(() => makeSlots(workStart, workEnd), []);
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    return [
      ...Array(offset).fill(null),
      ...Array.from({ length: count }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1)),
    ];
  }, [month]);

  const unavailable = closedSlots[selectedDate] || [];
  const available = slots.filter((slot) => !unavailable.includes(slot));
  const chosenDate = new Date(`${selectedDate}T12:00:00`);

  const changeMonth = (delta) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
    setSelectedTime('');
  };

  const chooseDate = (date) => {
    if (!date || date < today) return;
    setSelectedDate(toISO(date));
    setSelectedTime('');
  };

  function chooseTime() {
    if (!selectedDate || !selectedTime) return;

    const payload = {
      type: 'time_selected',
      date: selectedDate,
      time: selectedTime,
      timezone,
    };

    // sendData работает при запуске через reply KeyboardButton с web_app.
    // Для inline Web App понадобится backend API с проверкой Telegram initData.
    if (tg?.sendData) {
      tg.sendData(JSON.stringify(payload));
      return;
    }

    const message = `Выбрано: ${payload.date} в ${payload.time} (${payload.timezone}). Следующий шаг — в боте.`;
    if (tg?.showAlert) tg.showAlert(message);
    else alert(message);
  }

  const isTelegram = Boolean(tg?.initData);
  const invalidWorkingHours = slots.length === 0;

  return (
    <main className="page">
      <header className="header">
        <div className="eyebrow"><CalendarDays size={15} /> ОНЛАЙН-ЗАПИСЬ</div>
        <h1>Выберите дату<br />и время</h1>
        <p className="subtitle">Найдите удобное для вас время. Занятые часы отмечены отдельно.</p>
      </header>

      <section className="calendar card">
        <div className="monthbar">
          <div>
            <span className="section-label">ДАТА</span>
            <h2>{monthNames[month.getMonth()]} <span>{month.getFullYear()}</span></h2>
          </div>
          <div className="month-actions">
            <button aria-label="Предыдущий месяц" onClick={() => changeMonth(-1)}
              disabled={month.getFullYear() === today.getFullYear() && month.getMonth() <= today.getMonth()}>
              <ArrowLeft size={18} />
            </button>
            <button aria-label="Следующий месяц" onClick={() => changeMonth(1)}><ArrowRight size={18} /></button>
          </div>
        </div>

        <div className="calendar-grid weekday-row">
          {weekdays.map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="calendar-grid days-grid">
          {days.map((date, index) => {
            if (!date) return <span className="empty-day" key={`empty-${index}`} />;
            const iso = toISO(date);
            const past = date < today;
            const fullyBooked = slots.length === 0 || slots.every((slot) => (closedSlots[iso] || []).includes(slot));
            return (
              <button key={iso}
                className={`day ${iso === selectedDate ? 'selected' : ''} ${past || fullyBooked ? 'disabled' : ''}`}
                onClick={() => chooseDate(date)}
                disabled={past || fullyBooked}
                aria-label={`${date.toLocaleDateString('ru-RU')}${fullyBooked ? ', нет свободного времени' : ''}`}>
                {date.getDate()}
                {fullyBooked && <i />}
              </button>
            );
          })}
        </div>
        <div className="legend">
          <span><i className="legend-dot available-dot" /> Есть время</span>
          <span><i className="legend-dot selected-dot" /> Выбрано</span>
          <span><i className="legend-dot busy-dot" /> Нет мест</span>
        </div>
      </section>

      <section className="times-section">
        <div className="times-heading">
          <div>
            <span className="section-label">СВОБОДНОЕ ВРЕМЯ</span>
            <h2>{chosenDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</h2>
          </div>
          <span className="count">{available.length} слотов</span>
        </div>
        {invalidWorkingHours ? (
          <div className="empty-state">Рабочее время не настроено. Вернитесь в бот и откройте приложение по корректной ссылке.</div>
        ) : available.length ? (
          <div className="time-grid">
            {available.map((slot) => (
              <button key={slot}
                className={`time-slot ${selectedTime === slot ? 'active' : ''}`}
                onClick={() => setSelectedTime(slot)}>
                {slot}
                {selectedTime === slot && <Check size={15} />}
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state">На эту дату свободного времени нет. Выберите другой день.</div>
        )}
      </section>

      <footer className="footer">
        <div className="selection-summary">
          <div className="summary-icon"><Clock3 size={19} /></div>
          <div>
            <span>ВЫБРАННОЕ ВРЕМЯ</span>
            <strong>{selectedTime
              ? `${chosenDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}, ${selectedTime}`
              : 'Выберите время'}</strong>
          </div>
        </div>
        <button className="confirm-button" disabled={!selectedTime} onClick={chooseTime}>
          Выбрать время
        </button>
        {!isTelegram && <p className="browser-note">Демо-режим: в Telegram выбор времени будет передан боту для следующего шага.</p>}
      </footer>
    </main>
  );
}
