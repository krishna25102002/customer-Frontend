import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import CalendarPicker from './CalendarPicker';
import { C } from '../theme';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmtDisplay = (str) => {
  const parts = String(str || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return '';
  const [y, m, d] = parts;
  const date = new Date(y, m - 1, d);
  return `${DAYS[date.getDay()]}, ${d} ${MONTHS[m - 1]} ${y}`;
};

const DatePickerField = ({ value, onChange, placeholder = 'Select date' }) => {
  const [open, setOpen] = useState(false);
  const display = fmtDisplay(value);

  return (
    <View>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setOpen(true)}
        style={styles.field}
      >
        <MaterialIcons name="event" size={20} color={C.primary} />
        <Text style={[styles.text, !display && styles.placeholder]}>
          {display || placeholder}
        </Text>
        <View style={styles.calIcon}>
          <MaterialIcons name="calendar-month" size={18} color={C.accent} />
        </View>
      </TouchableOpacity>

      <CalendarPicker
        visible={open}
        value={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </View>
  );
};

export default DatePickerField;

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.inputBg,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  text: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
  placeholder: {
    color: C.textMuted,
    fontWeight: '400',
  },
  calIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: C.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
});