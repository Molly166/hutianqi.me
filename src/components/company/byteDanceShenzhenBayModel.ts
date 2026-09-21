import * as THREE from "three";
import { byteDanceShenzhenBayLandmark } from "../../data/landmarks";
import {
  addLogoDecal,
  createBox,
  markLandmark,
  sharedMaterial,
} from "../map/modelUtils";

const silver = sharedMaterial(
  new THREE.MeshStandardMaterial({
    color: 0xd0d3cd,
    roughness: 0.52,
    metalness: 0.13,
  }),
);

const paleGlass = sharedMaterial(
  new THREE.MeshStandardMaterial({
    color: 0x809492,
    roughness: 0.26,
    metalness: 0.21,
  }),
);

const coolGlass = sharedMaterial(
  new THREE.MeshStandardMaterial({
    color: 0x304b55,
    roughness: 0.19,
    metalness: 0.31,
  }),
);

const deepGlass = sharedMaterial(
  new THREE.MeshStandardMaterial({
    color: 0x1c343d,
    roughness: 0.22,
    metalness: 0.3,
  }),
);

const terraceGreen = sharedMaterial(
  new THREE.MeshStandardMaterial({
    color: 0x4d705a,
    roughness: 0.92,
  }),
);

type TowerSpec = {
  width: number;
  height: number;
  depth: number;
  x: number;
  z: number;
  storeys: number;
  crownSplit?: boolean;
};

function addVerticalFacade(
  parent: THREE.Object3D,
  spec: TowerSpec,
) {
  const { width, height, depth, x, z } = spec;
  const frontCount = Math.max(5, Math.round(width / 0.34));
  const frontFins = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.055, height * 0.94, 0.1),
    silver,
    frontCount,
  );
  const matrix = new THREE.Matrix4();

  for (let index = 0; index < frontCount; index += 1) {
    const finX = x - width * 0.42 + (index * width * 0.84) / (frontCount - 1);
    matrix.makeTranslation(finX, 1.18 + height / 2, z + depth / 2 + 0.045);
    frontFins.setMatrixAt(index, matrix);
  }
  frontFins.instanceMatrix.needsUpdate = true;
  parent.add(frontFins);

  const sideCount = Math.max(4, Math.round(depth / 0.4));
  const sideFins = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.1, height * 0.94, 0.055),
    silver,
    sideCount,
  );
  for (let index = 0; index < sideCount; index += 1) {
    const finZ = z - depth * 0.4 + (index * depth * 0.8) / (sideCount - 1);
    matrix.makeTranslation(x + width / 2 + 0.045, 1.18 + height / 2, finZ);
    sideFins.setMatrixAt(index, matrix);
  }
  sideFins.instanceMatrix.needsUpdate = true;
  parent.add(sideFins);

  const majorBandCount = Math.ceil(spec.storeys / 3);
  const floorBands = new THREE.InstancedMesh(
    new THREE.BoxGeometry(width * 0.9, 0.025, 0.07),
    silver,
    majorBandCount,
  );
  for (let index = 0; index < majorBandCount; index += 1) {
    const y = 1.65 + (index * (height - 0.75)) / Math.max(1, majorBandCount - 1);
    matrix.makeTranslation(x, y, z + depth / 2 + 0.052);
    floorBands.setMatrixAt(index, matrix);
  }
  floorBands.instanceMatrix.needsUpdate = true;
  parent.add(floorBands);
}

function addTower(parent: THREE.Object3D, spec: TowerSpec) {
  const { width, height, depth, x, z, crownSplit } = spec;
  const centerY = 1.18 + height / 2;

  createBox(
    parent,
    [width, height, depth],
    [x, centerY, z],
    coolGlass,
  );

  const lowerHeight = height * 0.3;
  createBox(
    parent,
    [width + 0.025, lowerHeight, depth + 0.025],
    [x, 1.18 + lowerHeight / 2, z],
    paleGlass,
  );
  createBox(
    parent,
    [width + 0.045, height * 0.13, depth + 0.045],
    [x, 1.18 + height * 0.34, z],
    silver,
  );

  createBox(
    parent,
    [width + 0.17, 0.16, depth + 0.17],
    [x, 1.16, z],
    deepGlass,
  );
  createBox(
    parent,
    [width + 0.15, 0.17, depth + 0.15],
    [x, 1.22 + height, z],
    silver,
  );

  if (crownSplit) {
    createBox(
      parent,
      [width * 0.2, height * 0.58, 0.08],
      [x + width * 0.22, 1.18 + height * 0.69, z + depth / 2 + 0.055],
      deepGlass,
      false,
    );
    createBox(
      parent,
      [width * 0.18, 0.4, depth * 0.72],
      [x - width * 0.24, 1.47 + height, z],
      silver,
    );
    createBox(
      parent,
      [width * 0.18, 0.4, depth * 0.72],
      [x + width * 0.24, 1.47 + height, z],
      silver,
    );
  }

  addVerticalFacade(parent, spec);
}

function addSkyBridge(
  parent: THREE.Object3D,
  y: number,
  start: THREE.Vector3,
  end: THREE.Vector3,
) {
  const bridge = new THREE.Group();
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  bridge.position.copy(start).add(end).multiplyScalar(0.5);
  bridge.position.y = y;
  bridge.rotation.y = -Math.atan2(direction.z, direction.x);

  createBox(bridge, [length + 0.42, 0.62, 1.66], [0, 0, 0], silver);
  createBox(bridge, [length + 0.18, 0.42, 1.69], [0, 0, 0], deepGlass, false);
  createBox(
    bridge,
    [length + 0.06, 0.08, 1.35],
    [0, 0.36, 0],
    terraceGreen,
    false,
  );
  parent.add(bridge);
}

export function createByteDanceShenzhenBayBuilding(onAssetReady?: () => void) {
  const building = new THREE.Group();
  building.rotation.y = 0.46;

  createBox(building, [6.15, 0.44, 4.25], [0, 0.34, -0.34], deepGlass);
  createBox(building, [5.65, 0.5, 3.75], [0, 0.76, -0.34], silver);

  const highRise = new THREE.Group();
  const towerBaseY = 1.18;
  const verticalScale = 1.9;
  highRise.scale.y = verticalScale;
  highRise.position.y = towerBaseY * (1 - verticalScale);
  building.add(highRise);

  const towers: TowerSpec[] = [
    {
      width: 2.7,
      height: 13.2,
      depth: 2.28,
      x: -1.75,
      z: -0.56,
      storeys: 69,
      crownSplit: true,
    },
    {
      width: 2.3,
      height: 10.3,
      depth: 2.12,
      x: 1.55,
      z: 0.08,
      storeys: 54,
      crownSplit: true,
    },
  ];
  towers.forEach((tower) => addTower(highRise, tower));

  addSkyBridge(
    highRise,
    5.15,
    new THREE.Vector3(-0.47, 0, -0.35),
    new THREE.Vector3(0.43, 0, -0.12),
  );
  addSkyBridge(
    highRise,
    8.25,
    new THREE.Vector3(-0.44, 0, -0.35),
    new THREE.Vector3(0.44, 0, -0.12),
  );
  addLogoDecal(highRise, {
    src: "/images/landmarks/logos/bytedance.png",
    size: [0.64, 0.29],
    position: [-2.58, 13.02, 0.695],
    uvRegion: {
      offset: [0, 0],
      repeat: [50 / 246, 1],
    },
    onReady: onAssetReady,
  });

  return markLandmark(building, byteDanceShenzhenBayLandmark);
}
