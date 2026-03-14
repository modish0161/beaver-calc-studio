// Billboard Text — always faces the camera regardless of orbit angle.
// Drop-in replacement for drei's <Text>. Import { Text } from here instead.

import { Text as DreiText } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { forwardRef, useRef } from 'react';
import * as THREE from 'three';

type DreiTextProps = React.ComponentProps<typeof DreiText>;

const Text = forwardRef<THREE.Object3D, DreiTextProps>((props, _fwdRef) => {
  const ref = useRef<THREE.Object3D>(null);
  useFrame(({ camera }) => {
    ref.current?.quaternion.copy(camera.quaternion);
  });
  // Strip any rotation prop so it doesn't fight the billboard quaternion
  const { rotation: _rot, ...rest } = props as any;
  return <DreiText ref={ref} {...rest} />;
});

Text.displayName = 'BillboardText';

export { Text };
