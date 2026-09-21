import * as THREE from "three";
import type { LandmarkDefinition } from "../../data/landmarks";

type LogoDecalOptions = {
  src: string;
  size: [number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  shape?: "circle" | "rectangle";
  uvRegion?: {
    offset: [number, number];
    repeat: [number, number];
  };
  onReady?: () => void;
};

export function sharedMaterial<T extends THREE.Material>(material: T): T {
  material.userData.shared = true;
  return material;
}

export function createBox(
  parent: THREE.Object3D,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
  shadows = true,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  parent.add(mesh);
  return mesh;
}

export function addLogoDecal(
  parent: THREE.Object3D,
  {
    src,
    size,
    position,
    rotation = [0, 0, 0],
    shape = "rectangle",
    uvRegion,
    onReady,
  }: LogoDecalOptions,
) {
  const texture = new THREE.TextureLoader().load(src, (loadedTexture) => {
    loadedTexture.colorSpace = THREE.SRGBColorSpace;
    loadedTexture.needsUpdate = true;
    onReady?.();
  });
  texture.colorSpace = THREE.SRGBColorSpace;
  if (uvRegion) {
    texture.offset.set(...uvRegion.offset);
    texture.repeat.set(...uvRegion.repeat);
  }

  const geometry =
    shape === "circle"
      ? new THREE.CircleGeometry(size[0] / 2, 48)
      : new THREE.PlaneGeometry(...size);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.04,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    toneMapped: false,
  });
  const decal = new THREE.Mesh(geometry, material);
  decal.position.set(...position);
  decal.rotation.set(...rotation);
  decal.castShadow = false;
  decal.receiveShadow = false;
  decal.renderOrder = 3;
  decal.userData.landmarkDecoration = true;
  decal.userData.hoverable = false;
  parent.add(decal);
  return decal;
}

export function markLandmark(
  landmark: THREE.Group,
  definition: LandmarkDefinition,
) {
  landmark.name = definition.id;
  landmark.userData.landmark = definition;
  landmark.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const isDecoration = child.userData.landmarkDecoration === true;
    child.castShadow = !isDecoration;
    child.receiveShadow = !isDecoration;
    child.userData.landmarkId = definition.id;
    child.userData.landmarkType = definition.type;
    child.userData.hoverable = !isDecoration;
  });
  return landmark;
}
