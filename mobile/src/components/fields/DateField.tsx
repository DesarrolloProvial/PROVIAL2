import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '../../core/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 32) / 7);

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAYS_ES = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getCalendarDays(year: number, month: number): Date[] {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const days: Date[] = [];

  for (let i = firstDow - 1; i >= 0; i--) {
    days.push(new Date(year, month - 1, prevMonthDays - i));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }
  let nextDay = 1;
  while (days.length < 42) {
    days.push(new Date(year, month + 1, nextDay++));
  }
  return days;
}

interface DateFieldProps {
  label: string;
  value: Date | string | null;
  onChange: (value: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export default function DateField({
  label,
  value,
  onChange,
  mode = 'date',
  error,
  helperText,
  required,
  disabled,
  minDate,
  maxDate,
}: DateFieldProps) {
  const theme = useTheme();
  const c = theme.colors;

  const [showModal, setShowModal] = useState(false);
  const [datetimeStep, setDatetimeStep] = useState<'date' | 'time'>('date');
  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth());
  const [pendingDate, setPendingDate] = useState<Date>(new Date());

  const dateValue = value ? new Date(value) : null;
  const hasValue = value !== null && value !== undefined && value !== '';
  const today = new Date();

  const openPicker = () => {
    if (disabled) return;
    const base = dateValue ?? new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setPendingDate(new Date(base));
    if (mode === 'datetime') setDatetimeStep('date');
    setShowModal(true);
  };

  const isDisabled = (d: Date): boolean => {
    if (minDate) {
      const minDay = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (day < minDay) return true;
    }
    if (maxDate) {
      const maxDay = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (day > maxDay) return true;
    }
    return false;
  };

  const handleSelectDay = (day: Date) => {
    if (isDisabled(day)) return;
    if (mode === 'date') {
      const result = new Date(day.getFullYear(), day.getMonth(), day.getDate(),
        dateValue?.getHours() ?? 0, dateValue?.getMinutes() ?? 0);
      onChange(result);
      setShowModal(false);
    } else {
      // datetime: pick date then time
      const base = new Date(day.getFullYear(), day.getMonth(), day.getDate(),
        dateValue?.getHours() ?? 0, dateValue?.getMinutes() ?? 0);
      setPendingDate(base);
      setDatetimeStep('time');
    }
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowModal(false);
    if (event.type === 'set' && selectedDate) {
      if (mode === 'time') {
        onChange(selectedDate);
      } else {
        const result = new Date(pendingDate);
        result.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
        onChange(result);
      }
      setShowModal(false);
    }
  };

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const formatDisplayValue = (): string => {
    if (!hasValue || !dateValue) return 'Seleccionar...';
    switch (mode) {
      case 'date':
        return dateValue.toLocaleDateString('es-GT');
      case 'time':
        return dateValue.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
      case 'datetime':
        return `${dateValue.toLocaleDateString('es-GT')} ${dateValue.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}`;
      default:
        return '';
    }
  };

  const calDays = getCalendarDays(viewYear, viewMonth);
  const showCalendar = showModal && (mode === 'date' || (mode === 'datetime' && datetimeStep === 'date'));
  const showTimePicker = showModal && (mode === 'time' || (mode === 'datetime' && datetimeStep === 'time'));

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: error ? c.danger : c.text.primary }]}>
        {label}
        {required && <Text style={{ color: c.danger }}> *</Text>}
      </Text>

      <TouchableOpacity
        onPress={openPicker}
        disabled={disabled}
        activeOpacity={0.7}
        style={[
          styles.inputContainer,
          {
            backgroundColor: disabled ? c.gray[100] : c.surface,
            borderColor: error ? c.danger : c.border,
          },
        ]}
      >
        <Text style={{
          fontSize: 16,
          color: hasValue ? c.text.primary : c.text.disabled,
          flex: 1,
        }}>
          {formatDisplayValue()}
        </Text>
        <MaterialCommunityIcons
          name={mode === 'time' ? 'clock-outline' : 'calendar'}
          size={22}
          color={disabled ? c.text.disabled : c.primary}
        />
      </TouchableOpacity>

      {(error || helperText) && (
        <Text style={[styles.helperText, { color: error ? c.danger : c.text.secondary }]}>
          {error || helperText}
        </Text>
      )}

      {/* Calendar bottom sheet */}
      <Modal
        visible={showCalendar}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          />
          <SafeAreaView style={[styles.sheet, { backgroundColor: c.surface }]}>
            {/* Header */}
            <View style={[styles.sheetHeader, { borderBottomColor: c.border }]}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.headerSideBtn}>
                <Text style={{ color: c.danger, fontSize: 15 }}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: c.text.primary }]}>{label}</Text>
              <View style={styles.headerSideBtn} />
            </View>

            {/* Month navigation */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={goToPrevMonth} style={styles.navBtn}>
                <MaterialCommunityIcons name="chevron-left" size={26} color={c.text.primary} />
              </TouchableOpacity>
              <Text style={[styles.monthLabel, { color: c.text.primary }]}>
                {MONTHS_ES[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity onPress={goToNextMonth} style={styles.navBtn}>
                <MaterialCommunityIcons name="chevron-right" size={26} color={c.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Day headers */}
            <View style={styles.dayHeaders}>
              {DAYS_ES.map(d => (
                <View key={d} style={styles.dayHeaderCell}>
                  <Text style={[styles.dayHeaderText, { color: c.text.secondary }]}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.grid}>
              {calDays.map((day, idx) => {
                const isCurrentMonth = day.getMonth() === viewMonth;
                const isSelected = dateValue ? isSameCalendarDay(day, dateValue) : false;
                const isTodayDay = isSameCalendarDay(day, today);
                const disabled = isDisabled(day);

                let textColor = c.text.primary;
                if (disabled) textColor = c.text.disabled;
                else if (isSelected) textColor = c.text.inverse;
                else if (!isCurrentMonth) textColor = c.text.disabled;
                else if (isTodayDay) textColor = c.primary;

                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => !disabled && handleSelectDay(day)}
                    disabled={disabled}
                    style={[
                      styles.dayCell,
                      isSelected && { backgroundColor: c.primary },
                      isTodayDay && !isSelected && { backgroundColor: c.primary + '20' },
                    ]}
                  >
                    <Text style={{
                      fontSize: 14,
                      color: textColor,
                      fontWeight: isSelected || isTodayDay ? '600' : '400',
                      textAlign: 'center',
                    }}>
                      {day.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Hoy shortcut */}
            <TouchableOpacity
              style={styles.todayBtn}
              onPress={() => {
                if (!isDisabled(today)) handleSelectDay(today);
              }}
            >
              <Text style={{ color: c.primary, fontWeight: '600', fontSize: 15 }}>Hoy</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Time picker — iOS modal */}
      {Platform.OS === 'ios' && showTimePicker && (
        <Modal
          visible
          animationType="slide"
          transparent
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.overlay}>
            <SafeAreaView style={[styles.sheet, { backgroundColor: c.surface }]}>
              <View style={[styles.sheetHeader, { borderBottomColor: c.border }]}>
                {mode === 'datetime' ? (
                  <TouchableOpacity
                    onPress={() => setDatetimeStep('date')}
                    style={styles.headerSideBtn}
                  >
                    <Text style={{ color: c.primary, fontSize: 15 }}>← Fecha</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => setShowModal(false)} style={styles.headerSideBtn}>
                    <Text style={{ color: c.danger, fontSize: 15 }}>Cancelar</Text>
                  </TouchableOpacity>
                )}
                <Text style={[styles.headerTitle, { color: c.text.primary }]}>
                  {mode === 'datetime' ? 'Hora' : label}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    onChange(pendingDate);
                    setShowModal(false);
                  }}
                  style={styles.headerSideBtn}
                >
                  <Text style={{ color: c.primary, fontSize: 15, fontWeight: '600', textAlign: 'right' }}>
                    Listo
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pendingDate}
                mode="time"
                display="spinner"
                onChange={(_, date) => { if (date) setPendingDate(date); }}
                style={{ height: 200, width: '100%' }}
              />
            </SafeAreaView>
          </View>
        </Modal>
      )}

      {/* Time picker — Android native dialog */}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          value={mode === 'datetime' ? pendingDate : (dateValue ?? new Date())}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 8,
  },
  helperText: {
    marginTop: 4,
    fontSize: 12,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSideBtn: {
    minWidth: 70,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  navBtn: {
    padding: 4,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  dayHeaders: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  dayHeaderCell: {
    width: CELL_SIZE,
    alignItems: 'center',
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CELL_SIZE / 2,
  },
  todayBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
});
