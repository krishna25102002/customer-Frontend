import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { C } from '../theme';

const ICONS = {
  success: { name: 'check-circle', color: C.success, soft: C.successSoft },
  error: { name: 'error', color: C.danger, soft: C.dangerSoft },
  info: { name: 'info', color: C.info, soft: C.infoSoft },
  warning: { name: 'warning', color: C.warning, soft: '#FFF4E0' },
};

const AlertContext = createContext(null);

const Button = ({ label, style, onPress, disabled, containerStyle }) => {
  const base = styles.btn;
  const theme =
    style === 'cancel'
      ? styles.btnCancel
      : style === 'destructive'
        ? styles.btnDestructive
        : styles.btnPrimary;
  const textColor = style === 'cancel' ? C.textSub : C.white;
  return (
    <TouchableOpacity
      style={[base, theme, containerStyle, disabled && { opacity: 0.6 }]}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.btnText, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
};

// Imperative singleton so non-hook callers can still use the alerts.
let singleton = null;

export const AlertProvider = ({ children }) => {
  const [queue, setQueue] = useState([]);
  const [visible, setVisible] = useState(false);
  const current = queue[0] || null;
  const anim = useRef(new Animated.Value(0)).current;

  const close = useCallback(() => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setQueue((q) => q.slice(1));
      setVisible(false);
    });
  }, [anim]);

  const show = useCallback(
    (opts) => {
      const config = {
        type: 'info',
        title: '',
        message: '',
        buttons: null,
        autoClose: 0,
        ...(typeof opts === 'string' ? { message: opts } : opts),
      };
      setQueue((q) => [...q, config]);
      setVisible(true);
    },
    []
  );

  const success = useCallback((title, message) => show({ type: 'success', title, message }), [show]);
  const error = useCallback((title, message) => show({ type: 'error', title, message }), [show]);
  const info = useCallback((title, message) => show({ type: 'info', title, message }), [show]);
  const warning = useCallback((title, message) => show({ type: 'warning', title, message }), [show]);

  const confirm = useCallback(
    (opts) => {
      show({
        type: opts.type || 'info',
        title: opts.title || '',
        message: opts.message || '',
        buttons: [
          { text: opts.cancelText || 'Cancel', style: 'cancel', onPress: opts.onCancel },
          {
            text: opts.confirmText || 'OK',
            style: opts.destructive ? 'destructive' : 'default',
            onPress: opts.onConfirm,
          },
        ],
      });
    },
    [show]
  );

  const api = useMemo(
    () => ({ show, success, error, info, warning, confirm }),
    [show, success, error, info, warning, confirm]
  );
  singleton = api;

  const enter = useCallback(() => {
    anim.setValue(0);
    Animated.spring(anim, {
      toValue: 1,
      friction: 7,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [anim]);

  const handleClose = () => {
    close();
  };

  const iconMeta = (current && ICONS[current.type]) || ICONS.info;

  React.useEffect(() => {
    if (current) enter();
  }, [current, enter]);

  const autoCloseTimer = useRef(null);
  React.useEffect(() => {
    if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
    if (current && current.autoClose > 0 && current.buttons == null) {
      autoCloseTimer.current = setTimeout(() => close(), current.autoClose);
    }
    return () => {
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
    };
  }, [current, close]);

  return (
    <AlertContext.Provider value={api}>
      {children}
      <Modal transparent visible={visible && !!current} animationType="fade" onRequestClose={handleClose}>
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.card,
              {
                opacity: anim,
                transform: [
                  { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) },
                  { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                ],
              },
            ]}
          >
            <View style={[styles.iconBadge, { backgroundColor: iconMeta.soft }]}>
              <MaterialIcons name={iconMeta.name} size={34} color={iconMeta.color} />
            </View>
            <Text style={styles.title}>{current?.title || ''}</Text>
            {!!current?.message && <Text style={styles.message}>{current.message}</Text>}
            <View style={styles.btnRow}>
              {current && current.buttons && current.buttons.length > 0
                ? current.buttons.map((b, i) => (
                    <Button
                      key={i}
                      label={b.text || 'OK'}
                      style={b.style || 'default'}
                      containerStyle={i > 0 && styles.btnGap}
                      onPress={() => {
                        close();
                        if (b.onPress) b.onPress();
                      }}
                    />
                  ))
                : (
                  <Button label="OK" style="default" onPress={handleClose} />
                )}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const ctx = useContext(AlertContext);
  if (ctx) return ctx;
  if (!singleton) {
    return {
      show: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      warning: () => {},
      confirm: () => {},
    };
  }
  return singleton;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16,22,41,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: C.surface,
    borderRadius: 22,
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 16,
  },
  iconBadge: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  message: {
    marginTop: 8,
    fontSize: 13.5,
    lineHeight: 20,
    color: C.textSub,
    textAlign: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 22,
    width: '100%',
  },
  btn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGap: {
    marginLeft: 10,
  },
  btnPrimary: {
    backgroundColor: C.accent,
  },
  btnCancel: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderDark,
  },
  btnDestructive: {
    backgroundColor: C.danger,
  },
  btnText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default AlertProvider;