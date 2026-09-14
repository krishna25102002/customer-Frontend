import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { C } from '../theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const fmtDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseDate = (str) => {
  const [y, m, d] = String(str || '').split('-').map(Number);
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
};

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfDay = (d) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

const CalendarPicker = ({ visible, value, onSelect, onClose }) => {
  const today = startOfDay(new Date());

  const [viewDate, setViewDate] = useState(() => parseDate(value));

  useEffect(() => {
    if (visible) {
      setViewDate(parseDate(value));
    }
  }, [visible, value]);

  const monthStart = startOfDay(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1));
  const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const leadingBlanks = monthStart.getDay();
  const cells = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1)
    ),
  ];

  const canGoPrev =
    viewDate.getFullYear() > today.getFullYear() ||
    (viewDate.getFullYear() === today.getFullYear() &&
      viewDate.getMonth() > today.getMonth());

  const goMonth = (offset) => {
    setViewDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1)
    );
  };

  const handlePick = (cell) => {
    onSelect(fmtDate(cell));
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Date</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={22} color={C.textSub} />
            </TouchableOpacity>
          </View>

          <View style={styles.monthRow}>
            <TouchableOpacity
              onPress={() => goMonth(-1)}
              disabled={!canGoPrev}
              style={[styles.arrowBtn, !canGoPrev && styles.arrowDisabled]}
            >
              <MaterialIcons name="chevron-left" size={26} color={canGoPrev ? C.primary : C.textMuted} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </Text>
            <TouchableOpacity onPress={() => goMonth(1)} style={styles.arrowBtn}>
              <MaterialIcons name="chevron-right" size={26} color={C.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((w) => (
              <Text key={w} style={styles.weekLabel}>{w}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((cell, i) => {
              if (cell === null) return <View key={`b${i}`} style={styles.dayCell} />;
              const isPast = startOfDay(cell) < today;
              const isToday = sameDay(cell, today);
              const isSelected = sameDay(cell, parseDate(value));
              return (
                <TouchableOpacity
                  key={`d${i}`}
                  disabled={isPast}
                  onPress={() => handlePick(cell)}
                  style={styles.dayCell}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      isToday && styles.dayToday,
                      isSelected && styles.daySelected,
                      isPast && styles.dayPast,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isToday && styles.dayTextToday,
                        isSelected && styles.dayTextSelected,
                        isPast && styles.dayTextPast,
                      ]}
                    >
                      {cell.getDate()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.todayBtn} onPress={() => handlePick(today)}>
              <Text style={styles.todayText}>Today</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CalendarPicker;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: C.text,
  },
  closeBtn: {
    padding: 2,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  arrowBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowDisabled: {
    opacity: 0.4,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: C.primary,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: C.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: C.accent,
  },
  daySelected: {
    backgroundColor: C.accent,
  },
  dayPast: {
    opacity: 0.35,
  },
  dayText: {
    fontSize: 15,
    color: C.text,
    fontWeight: '600',
  },
  dayTextToday: {
    color: C.accent,
    fontWeight: 'bold',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dayTextPast: {
    color: C.textMuted,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  cancelText: {
    color: C.textSub,
    fontWeight: '600',
  },
  todayBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 22,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  todayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});