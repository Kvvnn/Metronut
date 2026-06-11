/**
 * RouteConfirmModal — 웹 `RouteConfirmDialog` 모바일 이식.
 * 출발/도착이 모두 선택되면 하단에서 슬라이드업(ease-out-expo)으로 등장하는 확인 모달.
 * 백드롭 탭/취소 → onCancel, 시작 → onConfirm.
 */
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { easeOutExpo } from '@/lib/animations';
import { colors } from '@/lib/theme';

export function RouteConfirmModal({
  open,
  from,
  via,
  to,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  from: string;
  via?: string;
  to: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(180)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="닫기" />
        <Animated.View
          entering={SlideInDown.duration(350).easing(easeOutExpo)}
          style={[styles.card, { marginBottom: insets.bottom + 72 }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.kicker}>경로 시작</Text>
            <Pressable onPress={onCancel} hitSlop={8} style={styles.closeBtn} accessibilityLabel="닫기">
              <Ionicons name="close" size={14} color={colors.subtleText} />
            </Pressable>
          </View>

          {/* From */}
          <View style={styles.endpointRow}>
            <View style={[styles.pin, { backgroundColor: '#EBF4FF' }]}>
              <Ionicons name="location" size={14} color={colors.accent} />
            </View>
            <Text style={styles.endpointText} numberOfLines={1}>
              {from}
            </Text>
          </View>

          {via ? (
            <View style={styles.viaRow}>
              <Text style={styles.viaBar}>┃</Text>
              <View style={[styles.viaDot, { backgroundColor: '#EAF7EF' }]}>
                <Ionicons name="add" size={11} color={colors.green} />
              </View>
              <Text style={styles.viaText} numberOfLines={1}>
                {via} 경유
              </Text>
            </View>
          ) : (
            <View style={styles.connector}>
              <Ionicons name="chevron-down" size={14} color={colors.muted} />
            </View>
          )}

          {/* To */}
          <View style={styles.endpointRow}>
            <View style={[styles.pin, { backgroundColor: '#FFF0F0' }]}>
              <Ionicons name="location" size={14} color={colors.red} />
            </View>
            <Text style={styles.endpointText} numberOfLines={1}>
              {to}
            </Text>
          </View>

          <Text style={styles.question}>이 경로로 시작하시겠습니까?</Text>

          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={({ pressed }) => [styles.btn, styles.btnCancel, pressed && styles.pressed]}>
              <Text style={styles.btnCancelText}>취소</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={({ pressed }) => [styles.btn, styles.btnConfirm, pressed && styles.pressed]}>
              <Text style={styles.btnConfirmText}>시작</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(15, 23, 36, 0.55)',
  },
  card: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    maxWidth: 420,
    padding: 20,
    width: '100%',
    shadowColor: '#0F1724',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 18,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kicker: {
    color: colors.subtleText,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  endpointRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  pin: {
    alignItems: 'center',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  endpointText: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
  },
  viaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginLeft: 14,
    paddingVertical: 6,
  },
  viaBar: {
    color: colors.green,
    fontSize: 16,
  },
  viaDot: {
    alignItems: 'center',
    borderRadius: 999,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  viaText: {
    color: colors.green,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  connector: {
    marginLeft: 14,
    paddingVertical: 4,
  },
  question: {
    color: colors.text,
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  btn: {
    alignItems: 'center',
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 13,
  },
  btnCancel: {
    backgroundColor: colors.surfaceAlt,
  },
  btnCancelText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  btnConfirm: {
    backgroundColor: colors.primary,
  },
  btnConfirmText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
});
