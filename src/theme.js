// =============================================
// 🎨 DriveGo Customer Theme — Navy + Orange
// =============================================

export const C = {
  // Brand (Navy)
  primary: '#1B2A4A',
  primaryDark: '#131E38',
  primarySoft: '#E9EDF5',
  primaryBorder: '#C8D2E4',

  // Action (Orange)
  accent: '#FF6A00',
  accentDark: '#E85D00',
  accentSoft: '#FFF0E3',
  accentBorder: '#FFD9BC',

  // Surfaces
  bg: '#F5F5F7',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFAFB',
  border: '#EDEDEF',
  borderDark: '#E0E0E4',

  // Text
  text: '#1A1A1A',
  textSub: '#6B6B6B',
  textMuted: '#9E9EA7',

  // Status
  warning: '#FF9500',
  success: '#22B358',
  successSoft: '#E6F7EE',
  danger: '#EF4444',
  dangerSoft: '#FDEBEC',
  info: '#3B82F6',
  infoSoft: '#E8F1FE',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  inputBg: '#F2F2F4',
};

// Shared card shadow (soft, modern)
export const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 3,
};

// Shared style fragments for common shapes
export const card = {
  backgroundColor: C.surface,
  borderRadius: 16,
  padding: 16,
  ...shadow,
};

export const primaryButton = {
  backgroundColor: C.accent,
  borderRadius: 30,
  paddingVertical: 14,
  paddingHorizontal: 24,
  alignItems: 'center',
  ...shadow,
  shadowOpacity: 0.18,
};

export const outlineButton = {
  borderWidth: 1.5,
  borderColor: C.accent,
  borderRadius: 30,
  paddingVertical: 13,
  paddingHorizontal: 24,
  alignItems: 'center',
};

export const input = {
  backgroundColor: C.inputBg,
  borderRadius: 14,
  paddingHorizontal: 14,
  color: C.text,
};

export default C;