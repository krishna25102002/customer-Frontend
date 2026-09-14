import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';

import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { C } from '../theme';

/* ============================================================
   CONFIG
============================================================ */

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PAD_COUNT = Math.floor(VISIBLE_ITEMS / 2);

const HOURS = Array.from(
  { length: 12 },
  (_, index) => index + 1
);

const MINUTES = [
  0,
  5,
  10,
  15,
  20,
  25,
  30,
  35,
  40,
  45,
  50,
  55,
];

const PERIODS = ['AM', 'PM'];

/* ============================================================
   HELPERS
============================================================ */

const pad = (number) =>
  String(number).padStart(2, '0');

const parseTimeToComponents = (timeStr) => {
  const value = String(
    timeStr || '9:00 AM'
  )
    .trim()
    .toUpperCase();

  const period = value.includes('PM')
    ? 'PM'
    : 'AM';

  const cleaned = value
    .replace(/\s*(AM|PM)\s*/i, '')
    .trim();

  const parts = cleaned
    .split(':')
    .map(Number);

  let hour = parts[0] || 9;
  const minute = parts[1] || 0;

  if (hour > 12) {
    hour -= 12;
  }

  if (hour === 0) {
    hour = 12;
  }

  return {
    hour,
    minute,
    period,
  };
};

/* ============================================================
   WHEEL COLUMN
============================================================ */

const WheelColumn = React.memo(
  ({
    data,
    selected,
    onChange,
    formatItem,
    width = 76,
  }) => {
    const scrollRef = useRef(null);

    const scrollY = useRef(
      new Animated.Value(0)
    ).current;

    const isDragging = useRef(false);

    const didInitRef = useRef(false);

    const lastYRef = useRef(0);

    const lastMoveTimeRef = useRef(0);

    const settleGuardRef = useRef(null);

    const selectedIndex = Math.max(
      0,
      data.indexOf(selected)
    );

    /*
      Align the selected item to the center when
      the wheel mounts / modal opens.
    */
    useEffect(() => {
      const timer = setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            y: selectedIndex * ITEM_HEIGHT,
            animated: false,
          });
        }

        scrollY.setValue(
          selectedIndex * ITEM_HEIGHT
        );

        lastYRef.current =
          selectedIndex * ITEM_HEIGHT;

        didInitRef.current = true;
      }, 80);

      return () => {
        clearTimeout(timer);
        clearTimeout(settleGuardRef.current);
      };

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /*
      Keep the wheel synchronized after the picker is
      reopened with a different value. The initial
      alignment is handled by the effect above, so we
      skip the very first run to avoid a visible jump.
    */
    useEffect(() => {
      if (
        !didInitRef.current ||
        isDragging.current
      ) {
        return;
      }

      const timer = setTimeout(() => {
        if (!scrollRef.current) {
          return;
        }

        scrollRef.current.scrollTo({
          y: selectedIndex * ITEM_HEIGHT,
          animated: true,
        });
      }, 50);

      return () => clearTimeout(timer);
    }, [selectedIndex]);

    /*
      Native-driven scrolling animation. The listener
      only updates refs (never state) so it stays cheap
      and free of re-renders.
    */
    const handleScroll = useMemo(
      () =>
        Animated.event(
          [
            {
              nativeEvent: {
                contentOffset: {
                  y: scrollY,
                },
              },
            },
          ],
          {
            useNativeDriver: true,
            listener: (event) => {
              const offset =
                event.nativeEvent.contentOffset.y;

              lastYRef.current = offset;

              lastMoveTimeRef.current =
                Date.now();
            },
          }
        ),
      [scrollY]
    );

    /*
      Commit the settled value and make sure the wheel
      is snapped exactly to the center position.
    */
    const commitFromOffset = useCallback(
      (offset) => {
        const index = Math.round(
          offset / ITEM_HEIGHT
        );

        const safeIndex = Math.max(
          0,
          Math.min(
            index,
            data.length - 1
          )
        );

        const finalY =
          safeIndex * ITEM_HEIGHT;

        if (
          Math.abs(offset - finalY) >
          0.5
        ) {
          scrollRef.current?.scrollTo({
            y: finalY,
            animated: false,
          });

          scrollY.setValue(finalY);
        }

        const newValue =
          data[safeIndex];

        if (newValue !== selected) {
          onChange(newValue);
        }

        isDragging.current = false;
      },
      [data, onChange, selected, scrollY]
    );

    /*
      iOS: a slow release does not always produce a
      momentum event, so commit right away when the
      release velocity is negligible.
    */
    const handleEndDrag = useCallback(
      (event) => {
        const velocity =
          event.nativeEvent.velocity?.y ||
          0;

        if (
          Platform.OS === 'ios'
        ) {
          if (
            Math.abs(velocity) < 0.2
          ) {
            commitFromOffset(
              lastYRef.current
            );
          }

          return;
        }

        /*
          Android: velocity is usually missing and a
          plain drag may not fire onMomentumScrollEnd
          (disableIntervalMomentum). Poll until the
          wheel actually stops moving, then commit.
        */
        clearTimeout(
          settleGuardRef.current
        );

        const checkAndAutoSettle = () => {
          const now = Date.now();

          if (
            now -
              lastMoveTimeRef.current <
            60
          ) {
            settleGuardRef.current =
              setTimeout(
                checkAndAutoSettle,
                60
              );
            return;
          }

          commitFromOffset(
            lastYRef.current
          );
        };

        settleGuardRef.current =
          setTimeout(
            checkAndAutoSettle,
            140
          );
      },
      [commitFromOffset]
    );

    const handleMomentumEnd =
      useCallback(() => {
        clearTimeout(
          settleGuardRef.current
        );

        commitFromOffset(
          lastYRef.current
        );

        isDragging.current = false;
      }, [commitFromOffset]);

    /*
      Tapping an item.
    */
    const handleItemPress = useCallback(
      (item, index) => {
        clearTimeout(
          settleGuardRef.current
        );

        onChange(item);

        scrollRef.current?.scrollTo({
          y: index * ITEM_HEIGHT,
          animated: true,
        });
      },
      [onChange]
    );

    const handleBeginDrag =
      useCallback(() => {
        isDragging.current = true;

        clearTimeout(
          settleGuardRef.current
        );
      }, []);

    return (
      <View
        style={[
          wheel.container,
          {
            width,
          },
        ]}
      >
        {/* ==================================================
            SELECTED BACKGROUND
        ================================================== */}

        <View
          pointerEvents="none"
          style={wheel.selectedContainer}
        >
          <View style={wheel.selectedInner} />
        </View>

        {/* ==================================================
            WHEEL
        ================================================== */}

        <Animated.ScrollView
          ref={scrollRef}
          style={{
            height: WHEEL_HEIGHT,
          }}
          contentContainerStyle={{
            paddingVertical:
              ITEM_HEIGHT * PAD_COUNT,
          }}
          showsVerticalScrollIndicator={false}
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          scrollEventThrottle={16}
          snapToInterval={ITEM_HEIGHT}
          snapToAlignment="start"
          decelerationRate={
            Platform.OS === 'ios'
              ? 'fast'
              : 0.92
          }
          disableIntervalMomentum={
            Platform.OS === 'android'
          }
          onScroll={handleScroll}
          onScrollBeginDrag={handleBeginDrag}
          onMomentumScrollEnd={handleMomentumEnd}
          onScrollEndDrag={handleEndDrag}
        >
          {data.map((item, index) => {
            /*
              The actual scroll position is based
              on the item index.
            */
            const position =
              index * ITEM_HEIGHT;

            const inputRange = [
              position -
                2 * ITEM_HEIGHT,
              position -
                ITEM_HEIGHT,
              position,
              position +
                ITEM_HEIGHT,
              position +
                2 * ITEM_HEIGHT,
            ];

            /*
              Smooth scale animation.
            */
            const scale =
              scrollY.interpolate({
                inputRange,
                outputRange: [
                  0.82,
                  0.94,
                  1.06,
                  0.94,
                  0.82,
                ],
                extrapolate: 'clamp',
              });

            /*
              Smooth opacity animation.
            */
            const opacity =
              scrollY.interpolate({
                inputRange,
                outputRange: [
                  0.18,
                  0.52,
                  1,
                  0.52,
                  0.18,
                ],
                extrapolate: 'clamp',
              });

            /*
              Very subtle vertical movement.
            */
            const translateY =
              scrollY.interpolate({
                inputRange,
                outputRange: [
                  3,
                  1,
                  0,
                  -1,
                  -3,
                ],
                extrapolate: 'clamp',
              });

            return (
              <TouchableOpacity
                key={`${item}-${index}`}
                activeOpacity={0.7}
                onPress={() =>
                  handleItemPress(
                    item,
                    index
                  )
                }
                style={
                  wheel.itemTouch
                }
              >
                <Animated.View
                  style={[
                    wheel.item,
                    {
                      opacity,
                      transform: [
                        {
                          scale,
                        },
                        {
                          translateY,
                        },
                      ],
                    },
                  ]}
                >
                  <Text
                    style={[
                      wheel.itemText,
                      item === selected &&
                        wheel.itemTextSelected,
                    ]}
                  >
                    {formatItem
                      ? formatItem(item)
                      : item}
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </Animated.ScrollView>

        {/* ==================================================
            TOP FADE
        ================================================== */}

        <View
          pointerEvents="none"
          style={wheel.topFade}
        >
          <View style={wheel.fadeStrong} />
          <View style={wheel.fadeMedium} />
          <View style={wheel.fadeLight} />
        </View>

        {/* ==================================================
            BOTTOM FADE
        ================================================== */}

        <View
          pointerEvents="none"
          style={wheel.bottomFade}
        >
          <View style={wheel.fadeLight} />
          <View style={wheel.fadeMedium} />
          <View style={wheel.fadeStrong} />
        </View>
      </View>
    );
  }
);

/* ============================================================
   MAIN COMPONENT
============================================================ */

const TimePickerField = ({
  value,
  onChange,
}) => {
  const [open, setOpen] =
    useState(false);

  const parsed = useMemo(
    () =>
      parseTimeToComponents(value),
    [value]
  );

  const [preview, setPreview] =
    useState(parsed);

  /*
    Sync preview whenever picker opens.
  */
  useEffect(() => {
    if (open) {
      setPreview({
        ...parsed,
      });
    }
  }, [open, parsed]);

  const handleOpen = useCallback(() => {
    setPreview({
      ...parsed,
    });

    setOpen(true);
  }, [parsed]);

  const handleDismiss =
    useCallback(() => {
      setOpen(false);
    }, []);

  const handleSet =
    useCallback(() => {
      const finalTime =
        `${preview.hour}:${pad(
          preview.minute
        )} ${preview.period}`;

      onChange(finalTime);

      setOpen(false);
    }, [onChange, preview]);

  const setHour =
    useCallback((hour) => {
      setPreview((previous) => {
        if (
          previous.hour === hour
        ) {
          return previous;
        }

        return {
          ...previous,
          hour,
        };
      });
    }, []);

  const setMinute =
    useCallback((minute) => {
      setPreview((previous) => {
        if (
          previous.minute === minute
        ) {
          return previous;
        }

        return {
          ...previous,
          minute,
        };
      });
    }, []);

  const setPeriod =
    useCallback((period) => {
      setPreview((previous) => {
        if (
          previous.period === period
        ) {
          return previous;
        }

        return {
          ...previous,
          period,
        };
      });
    }, []);

  const previewLabel =
    `${preview.hour}:${pad(
      preview.minute
    )} ${preview.period}`;

  return (
    <View>
      {/* ====================================================
          FIELD
      ==================================================== */}

      <TouchableOpacity
        activeOpacity={0.75}
        onPress={handleOpen}
        style={styles.field}
      >
        <View
          style={styles.fieldIcon}
        >
          <MaterialIcons
            name="schedule"
            size={19}
            color={C.primary}
          />
        </View>

        <Text
          style={styles.fieldValue}
        >
          {value}
        </Text>

        <View
          style={styles.chevron}
        >
          <MaterialIcons
            name="keyboard-arrow-down"
            size={20}
            color={C.textSub}
          />
        </View>
      </TouchableOpacity>

      {/* ====================================================
          MODAL
      ==================================================== */}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={
          handleDismiss
        }
      >
        <View
          style={styles.overlay}
        >
          {/* Slight backdrop press */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleDismiss}
          />

          {/* ==================================================
              BOTTOM SHEET
          ================================================== */}

          <View
            style={styles.sheet}
          >
            {/* Drag handle */}

            <View
              style={styles.handle}
            />

            {/* ==================================================
                HEADER
            ================================================== */}

            <View
              style={styles.header}
            >
              <View>
                <Text
                  style={
                    styles.headerLabel
                  }
                >
                  Start Time
                </Text>

                <Text
                  style={
                    styles.headerValue
                  }
                >
                  {previewLabel}
                </Text>
              </View>

              <View
                style={styles.clockCircle}
              >
                <MaterialIcons
                  name="access-time"
                  size={25}
                  color={C.primary}
                />
              </View>
            </View>

            {/* ==================================================
                WHEEL LABELS
            ================================================== */}

            <View
              style={
                styles.labelsRow
              }
            >
              <View
                style={styles.labelBoxNarrow}
              >
                <Text
                  style={
                    styles.wheelLabel
                  }
                >
                  HOUR
                </Text>
              </View>

              <View
                style={styles.labelBoxNarrow}
              >
                <Text
                  style={
                    styles.wheelLabel
                  }
                >
                  MIN
                </Text>
              </View>

              <View
                style={styles.labelBoxWide}
              >
                <Text
                  style={
                    styles.wheelLabel
                  }
                >
                  AM/PM
                </Text>
              </View>
            </View>

            {/* ==================================================
                WHEELS
            ================================================== */}

            <View
              style={
                styles.wheelsRow
              }
            >
              <WheelColumn
                data={HOURS}
                selected={
                  preview.hour
                }
                onChange={setHour}
                formatItem={(v) =>
                  String(v)
                }
                width={76}
              />

              <Text
                style={
                  styles.separator
                }
              >
                :
              </Text>

              <WheelColumn
                data={MINUTES}
                selected={
                  preview.minute
                }
                onChange={setMinute}
                formatItem={(v) =>
                  pad(v)
                }
                width={76}
              />

              <View
                style={
                  styles.columnGap
                }
              />

              <WheelColumn
                data={PERIODS}
                selected={
                  preview.period
                }
                onChange={setPeriod}
                formatItem={(v) => v}
                width={82}
              />
            </View>

            {/* ==================================================
                FOOTER
            ================================================== */}

            <View
              style={styles.footer}
            >
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={
                  handleDismiss
                }
                style={
                  styles.cancelButton
                }
              >
                <Text
                  style={
                    styles.cancelText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSet}
                style={styles.setButton}
              >
                <Text
                  style={styles.setText}
                >
                  Set
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default TimePickerField;

/* ============================================================
   FIELD STYLES
============================================================ */

const styles = StyleSheet.create({
  /* ----------------------------------------------------------
     INPUT FIELD
  ---------------------------------------------------------- */

  field: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor:
      C.inputBg,

    borderRadius: 15,

    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  fieldIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      C.accentSoft,
  },

  fieldValue: {
    flex: 1,

    marginLeft: 10,

    color: C.text,
    fontSize: 15,
    fontWeight: '700',
  },

  chevron: {
    width: 32,
    height: 32,

    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      'rgba(0,0,0,0.035)',
  },

  /* ----------------------------------------------------------
     OVERLAY
  ---------------------------------------------------------- */

  overlay: {
    flex: 1,

    justifyContent: 'flex-end',

    backgroundColor:
      'rgba(15, 23, 42, 0.42)',
  },

  /* ----------------------------------------------------------
     BOTTOM SHEET
  ---------------------------------------------------------- */

  sheet: {
    backgroundColor:
      C.surface,

    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,

    paddingHorizontal: 22,
    paddingTop: 9,
    paddingBottom:
      Platform.OS === 'ios'
        ? 32
        : 26,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: -5,
    },

    shadowOpacity: 0.12,
    shadowRadius: 20,

    elevation: 20,
  },

  handle: {
    alignSelf: 'center',

    width: 42,
    height: 5,

    borderRadius: 10,

    backgroundColor:
      '#D9DCE2',

    marginBottom: 17,
  },

  /* ----------------------------------------------------------
     HEADER
  ---------------------------------------------------------- */

  header: {
    flexDirection: 'row',

    alignItems: 'center',
    justifyContent:
      'space-between',

    marginBottom: 16,
  },

  headerLabel: {
    color: C.textSub,

    fontSize: 13,
    fontWeight: '600',

    marginBottom: 2,
  },

  headerValue: {
    color: C.text,

    fontSize: 29,
    lineHeight: 35,

    fontWeight: '800',

    letterSpacing: -0.5,
  },

  clockCircle: {
    width: 46,
    height: 46,

    borderRadius: 23,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      C.inputBg,

    borderWidth: 1,
    borderColor:
      'rgba(0,0,0,0.055)',
  },

  /* ----------------------------------------------------------
     LABELS
  ---------------------------------------------------------- */

  labelsRow: {
    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 7,
  },

  labelBoxNarrow: {
    alignItems: 'center',
    justifyContent: 'center',

    width: 76,
  },

  labelBoxWide: {
    alignItems: 'center',
    justifyContent: 'center',

    width: 82,
  },

  wheelLabel: {
    color: C.textSub,

    fontSize: 10,

    fontWeight: '800',

    letterSpacing: 1.1,
  },

  /* ----------------------------------------------------------
     WHEELS
  ---------------------------------------------------------- */

  wheelsRow: {
    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',
  },

  separator: {
    width: 18,

    textAlign: 'center',

    color: C.textMuted,

    fontSize: 28,
    fontWeight: '700',

    marginTop: 1,
  },

  columnGap: {
    width: 8,
  },

  /* ----------------------------------------------------------
     FOOTER
  ---------------------------------------------------------- */

  footer: {
    flexDirection: 'row',

    alignItems: 'center',
    justifyContent:
      'space-between',

    marginTop: 22,

    paddingHorizontal: 1,
  },

  cancelButton: {
    height: 48,

    minWidth: 105,

    paddingHorizontal: 24,

    borderRadius: 24,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      C.surface,

    borderWidth: 1.2,

    borderColor:
      '#D9DDE4',
  },

  cancelText: {
    color: C.textSub,

    fontSize: 14,

    fontWeight: '700',
  },

  setButton: {
    height: 48,

    minWidth: 108,

    paddingHorizontal: 30,

    borderRadius: 24,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      C.accent,

    shadowColor:
      C.accent,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.24,
    shadowRadius: 9,

    elevation: 5,
  },

  setText: {
    color: '#FFFFFF',

    fontSize: 14,

    fontWeight: '800',
  },
});

/* ============================================================
   WHEEL STYLES
============================================================ */

const wheel = StyleSheet.create({
  /* ----------------------------------------------------------
     WHEEL CONTAINER
  ---------------------------------------------------------- */

  container: {
    height: WHEEL_HEIGHT,

    position: 'relative',

    overflow: 'hidden',

    borderRadius: 19,

    backgroundColor:
      '#FBFBFC',

    borderWidth: 1,

    borderColor:
      'rgba(20, 30, 50, 0.07)',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.06,
    shadowRadius: 7,

    elevation: 2,
  },

  /* ----------------------------------------------------------
     SELECTED AREA
  ---------------------------------------------------------- */

  selectedInner: {
    flex: 1,

    borderRadius: 15,

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.8)',
  },

  /* ----------------------------------------------------------
     ITEMS
  ---------------------------------------------------------- */

  itemTouch: {
    height: ITEM_HEIGHT,

    justifyContent: 'center',
    alignItems: 'center',
  },

  item: {
    height: ITEM_HEIGHT,

    width: '100%',

    justifyContent: 'center',
    alignItems: 'center',

    zIndex: 10,
  },

  itemText: {
    color: '#687080',

    fontSize: 18,

    fontWeight: '600',

    letterSpacing: 0.1,

    fontVariant: [
      'tabular-nums',
    ],
  },

  itemTextSelected: {
    color: '#182238',

    fontSize: 20,

    fontWeight: '800',
  },

  /* ----------------------------------------------------------
     TOP FADE
  ---------------------------------------------------------- */

  topFade: {
    position: 'absolute',

    top: 0,
    left: 0,
    right: 0,

    height:
      ITEM_HEIGHT * 1.35,

    zIndex: 20,
  },

  /* ----------------------------------------------------------
     BOTTOM FADE
  ---------------------------------------------------------- */

  bottomFade: {
    position: 'absolute',

    bottom: 0,
    left: 0,
    right: 0,

    height:
      ITEM_HEIGHT * 1.35,

    zIndex: 20,
  },

  fadeStrong: {
    flex: 1,

    backgroundColor:
      '#FBFBFC',

    opacity: 0.92,
  },

  fadeMedium: {
    flex: 1,

    backgroundColor:
      '#FBFBFC',

    opacity: 0.62,
  },

  fadeLight: {
    flex: 1,

    backgroundColor:
      '#FBFBFC',

    opacity: 0.28,
  },
});