import * as THREE from "three";
import { schoolLandmark } from "@/data/landmarks";
import { addLogoDecal, markLandmark } from "@/components/map/modelUtils";

const ivory = new THREE.MeshStandardMaterial({
  color: 0xd8d2c0,
  roughness: 0.82,
  metalness: 0.02,
});

const paleStone = new THREE.MeshStandardMaterial({
  color: 0xbeb8a7,
  roughness: 0.9,
});

const roofGreen = new THREE.MeshStandardMaterial({
  color: 0x244c43,
  roughness: 0.68,
});

const darkGlass = new THREE.MeshStandardMaterial({
  color: 0x18323a,
  roughness: 0.28,
  metalness: 0.22,
});

const windowGlass = new THREE.MeshStandardMaterial({
  color: 0x29434a,
  roughness: 0.34,
  metalness: 0.16,
});

const sharedMaterials = [
  ivory,
  paleStone,
  roofGreen,
  darkGlass,
  windowGlass,
];
sharedMaterials.forEach((material) => {
  material.userData.shared = true;
});

function box(
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

function hipRoof(width: number, depth: number, height: number) {
  const ridge = width * 0.19;
  const vertices = new Float32Array([
    -width / 2, 0, depth / 2,
    width / 2, 0, depth / 2,
    width / 2, 0, -depth / 2,
    -width / 2, 0, -depth / 2,
    -ridge, height, 0,
    ridge, height, 0,
  ]);

  const indices = [
    0, 1, 5, 0, 5, 4, 1, 2, 5, 2, 3, 4, 2, 4, 5, 3, 0, 4, 0, 3, 2,
    0, 2, 1,
  ];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addRoof(
  parent: THREE.Object3D,
  position: [number, number, number],
  width: number,
  depth: number,
  height: number,
) {
  box(
    parent,
    [width + 0.34, 0.13, depth + 0.34],
    [position[0], position[1] - 0.03, position[2]],
    roofGreen,
  );

  const roof = new THREE.Mesh(hipRoof(width, depth, height), roofGreen);
  roof.position.set(...position);
  roof.castShadow = true;
  roof.receiveShadow = true;
  parent.add(roof);
}

function addTower(parent: THREE.Object3D, x: number) {
  const tower = new THREE.Group();
  tower.position.x = x;

  box(tower, [2.55, 6.65, 2.25], [0, 5.28, 0], ivory);
  box(tower, [2.74, 0.24, 2.42], [0, 2.02, 0], paleStone);
  box(tower, [2.72, 0.23, 2.42], [0, 8.48, 0], paleStone);

  for (const side of [-1, 1]) {
    box(tower, [0.13, 6.3, 0.15], [side * 1.08, 5.27, 1.16], paleStone);
  }

  box(tower, [2.86, 0.28, 2.62], [0, 8.72, 0], roofGreen);
  box(tower, [2.42, 0.74, 2.14], [0, 9.2, 0], ivory);
  box(tower, [1.86, 0.34, 0.05], [0, 9.22, 1.095], darkGlass, false);
  addRoof(tower, [0, 9.63, 0], 3.0, 2.75, 0.48);

  box(tower, [1.72, 0.7, 1.64], [0, 10.34, 0], ivory);
  box(tower, [1.34, 0.31, 0.05], [0, 10.35, 0.845], darkGlass, false);
  addRoof(tower, [0, 10.72, 0], 2.25, 2.12, 0.58);

  const finial = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.06, 0.4, 8),
    roofGreen,
  );
  finial.position.set(0, 11.42, 0);
  finial.castShadow = true;
  tower.add(finial);

  parent.add(tower);
}

function addWindows(parent: THREE.Object3D) {
  const frontGeometry = new THREE.BoxGeometry(0.3, 0.22, 0.055);
  const frontWindows = new THREE.InstancedMesh(
    frontGeometry,
    windowGlass,
    2 * 11 * 4,
  );
  const matrix = new THREE.Matrix4();
  let index = 0;

  for (const towerX of [-1.7, 1.7]) {
    for (let floor = 0; floor < 11; floor += 1) {
      for (let column = 0; column < 4; column += 1) {
        const x = towerX + (column - 1.5) * 0.49;
        const y = 2.55 + floor * 0.5;
        matrix.makeTranslation(x, y, 1.155);
        frontWindows.setMatrixAt(index, matrix);
        index += 1;
      }
    }
  }

  frontWindows.castShadow = false;
  frontWindows.receiveShadow = false;
  frontWindows.instanceMatrix.needsUpdate = true;
  parent.add(frontWindows);

  const sideGeometry = new THREE.BoxGeometry(0.055, 0.22, 0.31);
  const sideWindows = new THREE.InstancedMesh(
    sideGeometry,
    windowGlass,
    2 * 2 * 11 * 3,
  );
  index = 0;
  for (const towerX of [-1.7, 1.7]) {
    for (const side of [-1, 1]) {
      for (let floor = 0; floor < 11; floor += 1) {
        for (let column = 0; column < 3; column += 1) {
          const x = towerX + side * 1.305;
          const y = 2.55 + floor * 0.5;
          const z = (column - 1) * 0.56;
          matrix.makeTranslation(x, y, z);
          sideWindows.setMatrixAt(index, matrix);
          index += 1;
        }
      }
    }
  }
  sideWindows.instanceMatrix.needsUpdate = true;
  parent.add(sideWindows);
}

function addCurvedColonnade(parent: THREE.Object3D) {
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-4.75, 1.55, 2.18),
    new THREE.Vector3(0, 1.55, 3.5),
    new THREE.Vector3(4.75, 1.55, 2.18),
  );

  const beam = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 48, 0.22, 8, false),
    roofGreen,
  );
  beam.castShadow = true;
  parent.add(beam);

  for (let i = 0; i < 11; i += 1) {
    const point = curve.getPoint(i / 10);
    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.09, 1.3, 10),
      paleStone,
    );
    column.position.set(point.x, 0.84, point.z);
    column.castShadow = true;
    parent.add(column);
  }
}

export function createLibrary(onAssetReady?: () => void) {
  const building = new THREE.Group();
  building.rotation.y = -0.08;

  box(building, [10.8, 0.64, 3.85], [0, 0.55, 0.12], paleStone);
  box(building, [10.15, 1.25, 3.35], [0, 1.18, 0.18], ivory);
  box(building, [3.1, 1.2, 0.12], [0, 1.28, 1.92], darkGlass, false);
  box(building, [1.18, 6.5, 1.62], [0, 5.26, -0.18], darkGlass, false);
  box(building, [1.36, 0.18, 1.8], [0, 8.45, -0.18], roofGreen);

  addTower(building, -1.7);
  addTower(building, 1.7);
  addWindows(building);
  addCurvedColonnade(building);
  addLogoDecal(building, {
    src: "/images/landmarks/logos/scuec.jpg",
    size: [0.86, 0.86],
    position: [0, 2.55, 0.646],
    shape: "circle",
    onReady: onAssetReady,
  });

  for (const x of [-4.58, 4.58]) {
    box(building, [1.0, 0.62, 1.15], [x, 2.02, 0.1], ivory);
    addRoof(building, [x, 2.32, 0.1], 1.25, 1.34, 0.26);
  }

  return markLandmark(building, schoolLandmark);
}
