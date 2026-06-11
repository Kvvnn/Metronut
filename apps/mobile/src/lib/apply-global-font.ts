/**
 * 전역 Pretendard 적용.
 *
 * RN 의 Text/TextInput 은 forwardRef 객체라 `.render` 를 패치할 수 있다. 각 렌더에서
 * 전달된 style 의 fontWeight 를 읽어 알맞은 Pretendard 패밀리를 fontFamily 로 주입한다.
 * 이렇게 하면 화면마다 fontFamily 를 손대지 않아도 전 앱이 웹과 같은 서체로 보인다.
 *
 * 주입한 fontFamily 는 배열 맨 앞에 두므로, 컴포넌트가 직접 지정한 style 이 항상 우선한다.
 */
import React from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native';

import { weightToFamily } from './fonts';

let patched = false;

export function applyGlobalFont() {
  if (patched) return;
  patched = true;

  for (const Component of [RNText, RNTextInput] as unknown as {
    render?: (props: { style?: unknown }, ref: unknown) => React.ReactElement;
  }[]) {
    const original = Component.render;
    if (typeof original !== 'function') continue;

    Component.render = function patchedRender(props, ref) {
      const flat = (StyleSheet.flatten(props?.style) ?? {}) as { fontWeight?: number | string };
      const family = weightToFamily(flat.fontWeight as never);
      const element = original.call(this, props, ref);
      return React.cloneElement(element, {
        style: [{ fontFamily: family }, props?.style],
      } as never);
    };
  }
}
