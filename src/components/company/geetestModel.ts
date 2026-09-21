import * as THREE from "three";
import { geetestLandmark } from "../../data/landmarks";
import {
  addLogoDecal,
  createBox,
  markLandmark,
  sharedMaterial,
} from "../map/modelUtils";

const concrete = sharedMaterial(
  new THREE.MeshStandardMaterial({
    color: 0xc8c8bc,
    roughness: 0.84,
    metalness: 0.03,
  }),
);

const paleConcrete = sharedMaterial(
  new THREE.MeshStandardMaterial({
    color: 0xe0dfd4,
    roughness: 0.9,
  }),
);

const glass = sharedMaterial(
  new THREE.MeshStandardMaterial({
    color: 0x263d49,
    roughness: 0.28,
    metalness: 0.22,
  }),
);

const verificationBlue = sharedMaterial(
  new THREE.MeshStandardMaterial({
    color: 0x446bc4,
    roughness: 0.46,
    metalness: 0.08,
  }),
);

const charcoal = sharedMaterial(
  new THREE.MeshStandardMaterial({
    color: 0x24312f,
    roughness: 0.72,
  }),
);

function addWindowBands(parent: THREE.Object3D) {
  const frontGeometry = new THREE.BoxGeometry(0.52, 0.29, 0.055);
  const windows = new THREE.InstancedMesh(frontGeometry, glass, 7 * 7);
  const matrix = new THREE.Matrix4();
  let index = 0;

  for (let floor = 0; floor < 7; floor += 1) {
    for (let column = 0; column < 7; column += 1) {
      matrix.makeTranslation(-1.93 + column * 0.64, 1.42 + floor * 0.74, 1.885);
      windows.setMatrixAt(index, matrix);
      index += 1;
    }
  }

  windows.instanceMatrix.needsUpdate = true;
  windows.castShadow = false;
  windows.receiveShadow = false;
  parent.add(windows);

  const sideGeometry = new THREE.BoxGeometry(0.055, 0.29, 0.48);
  const sideWindows = new THREE.InstancedMesh(sideGeometry, glass, 7 * 4);
  index = 0;
  for (let floor = 0; floor < 7; floor += 1) {
    for (let column = 0; column < 4; column += 1) {
      matrix.makeTranslation(2.285, 1.42 + floor * 0.74, -1.08 + column * 0.7);
      sideWindows.setMatrixAt(index, matrix);
      index += 1;
    }
  }
  sideWindows.instanceMatrix.needsUpdate = true;
  sideWindows.castShadow = false;
  sideWindows.receiveShadow = false;
  parent.add(sideWindows);
}

function addVerificationGate(parent: THREE.Object3D) {
  const gate = new THREE.Group();
  gate.position.set(0, 0, 2.38);

  createBox(gate, [2.9, 0.18, 0.62], [0, 2.18, 0], verificationBlue);
  createBox(gate, [0.18, 2.2, 0.62], [-1.36, 1.11, 0], verificationBlue);
  createBox(gate, [0.18, 2.2, 0.62], [1.36, 1.11, 0], verificationBlue);
  createBox(gate, [2.08, 0.14, 0.68], [0.26, 1.63, 0.04], paleConcrete);
  createBox(gate, [1.48, 0.12, 0.72], [-0.24, 1.1, 0.08], paleConcrete);

  const indicator = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 14, 10),
    verificationBlue,
  );
  indicator.position.set(0.94, 1.62, 0.42);
  gate.add(indicator);
  parent.add(gate);
}

export function createGeetestBuilding(onAssetReady?: () => void) {
  const building = new THREE.Group();
  building.rotation.y = -0.16;

  createBox(building, [5.3, 0.42, 4.2], [0, 0.38, 0], charcoal);
  createBox(building, [4.65, 5.95, 3.7], [0, 3.54, 0], concrete);
  createBox(building, [4.16, 0.24, 3.35], [0, 6.63, 0], charcoal);
  createBox(building, [2.3, 0.72, 1.72], [0.76, 7.1, -0.45], paleConcrete);
  createBox(building, [1.76, 0.08, 0.04], [0.76, 7.12, 0.43], glass, false);

  const verticalFins = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.09, 5.45, 0.12),
    paleConcrete,
    8,
  );
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < 8; index += 1) {
    matrix.makeTranslation(-2.18 + index * 0.62, 3.68, 1.91);
    verticalFins.setMatrixAt(index, matrix);
  }
  verticalFins.instanceMatrix.needsUpdate = true;
  building.add(verticalFins);

  addWindowBands(building);
  addVerificationGate(building);
  addLogoDecal(building, {
    src: "/images/landmarks/logos/geetest.png",
    size: [0.78, 0.78],
    position: [0, 5.72, 2.01],
    onReady: onAssetReady,
  });

  return markLandmark(building, geetestLandmark);
}
