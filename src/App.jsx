import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3 } from 'lucide-react';

const pad = (value) => String(value).padStart(2, '0');
const toISO = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const today = new Date();
today.setHours(0, 0, 0, 0);

// Временные демонстрационные занятые слоты. Позже заменим данными API.
const closedSlots = {
  [toISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1))]: ['10:00', '11:00', '15:00'],
  [toISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3))]: ['12:00', '13:00', '16:00'],
  [toISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5))]: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
};

const slots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function App() {
  const tg = window.Telegram?.WebApp;
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(toISO(today));
  const [selectedTime, setSelectedTime] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    tg?.ready();
    tg?.expand();
  }, [tg]);

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
    setSent(false);
  };

  async function confirmBooking() {
    if (!selectedDate || !selectedTime || sent) return;

    const payload = { date: selectedDate, time: selectedTime };

    // Для inline Web App-кнопки можно задать VITE_BOOKING_API_URL.
    // Сервер должен проверить initData и занятость слота перед созданием записи.
    const apiUrl = import.meta.env.VITE_BOOKING_API_URL;
    if (apiUrl) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': tg?.initData || '',
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Не удалось подтвердить запись');
        setSent(true);
        tg?.HapticFeedback?.notificationOccurred('success');
        tg?.showAlert?.('Заявка на запись отправлена');
      } catch (error) {
        tg?.showAlert?.(error.message || 'Ошибка отправки. Попробуйте ещё раз.');
        if (!tg) alert(error.message || 'Ошибка отправки');
      }
      return;
    }

    // Режим без backend: работает, когда Mini App открыт через KeyboardButton.
    if (tg?.sendData) {
      tg.sendData(JSON.stringify(payload));
      setSent(true);
      tg.HapticFeedback?.notificationOccurred('success');
    } else {
      alert(`Демо: выбрано ${payload.date} в ${payload.time}`);
      setSent(true);
    }
  }

  const isTelegram = Boolean(tg?.initData);

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
            const fullyBooked = slots.every((slot) => (closedSlots[iso] || []).includes(slot));
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
        {available.length ? (
          <div className="time-grid">
            {slots.map((slot) => {
              const busy = unavailable.includes(slot);
              return (
                <button key={slot}
                  className={`time-slot ${selectedTime === slot ? 'active' : ''} ${busy ? 'busy' : ''}`}
                  disabled={busy}
                  onClick={() => { setSelectedTime(slot); setSent(false); }}>
                  {slot}
                  {selectedTime === slot && <Check size={15} />}
                  {busy && <span className="busy-mark">занято</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">На эту дату свободного времени нет. Выберите другой день.</div>
        )}
      </section>

      <footer className="footer">
        <div className="selection-summary">
          <div className="summary-icon"><Clock3 size={19} /></div>
          <div>
            <span>ВАША ЗАПИСЬ</span>
            <strong>{selectedTime
              ? `${chosenDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}, ${selectedTime}`
              : 'Выберите время'}</strong>
          </div>
        </div>
        <button className="confirm-button" disabled={!selectedTime || sent} onClick={confirmBooking}>
          {sent ? <><Check size={18} /> Отправлено</> : 'Подтвердить запись'}
        </button>
        {!isTelegram && <p className="browser-note">Демо-режим: откройте приложение через Telegram для отправки данных боту.</p>}
      </footer>
    </main>
  );
}
