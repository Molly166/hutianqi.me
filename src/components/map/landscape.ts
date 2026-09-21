import * as THREE from "three";
import { sharedMaterial } from "./modelUtils";

const meadow = sharedMaterial(new THREE.MeshStandardMaterial({ color: 0x587b54, roughness: 1 }));
const softMeadow = sharedMaterial(new THREE.MeshStandardMaterial({ color: 0x6f9066, roughness: 1 }));
const pathStone = sharedMaterial(new THREE.MeshStandardMaterial({ color: 0xa9a28f, roughness: 0.98 }));
const trunkMaterial = sharedMaterial(new THREE.MeshStandardMaterial({ color: 0x756047, roughness: 1 }));
const foliageMaterial = sharedMaterial(new THREE.MeshStandardMaterial({
  color: 0x688b60,
  emissive: 0x294d31,
  emissiveIntensity: 0.72,
  roughness: 1,
  vertexColors: true,
}));
const shrubMaterial = sharedMaterial(new THREE.MeshStandardMaterial({
  color: 0x76976a,
  emissive: 0x315a36,
  emissiveIntensity: 0.62,
  roughness: 1,
  vertexColors: true,
}));
const grassMaterial = sharedMaterial(new THREE.MeshStandardMaterial({
  color: 0x5e844f,
  emissive: 0x2d532d,
  emissiveIntensity: 0.65,
  roughness: 1,
  vertexColors: true,
}));

type PlantPlacement = [x: number, z: number, scale: number];

const treePlacements: PlantPlacement[] = [
  [-7.2, -2.8, 1.05], [-6.8, -0.7, 0.9], [-6.4, 1.55, 1.15],
  [-5.9, 3.4, 0.82], [6.9, -2.7, 1.08], [6.5, -0.6, 0.88],
  [6.2, 1.8, 1.02], [5.7, 3.65, 0.78], [-3.9, -4.15, 0.74],
  [3.8, -4.25, 0.8], [8.4, -1.9, 0.82], [11.6, -3.1, 1.03],
  [13.4, -7.6, 0.92], [16.8, -8.7, 1.08], [18.1, -12.4, 0.83],
  [23.5, -11.2, 1.05], [25.2, -15.8, 0.9], [23.4, -20.2, 1.12],
  [18.5, -21.4, 0.82], [12.8, -19.8, 1.04], [-22.5, -19.0, 1.05],
  [-19.8, -20.3, 0.86], [-16.5, -18.4, 1.0], [-15.8, -14.8, 0.78],
  [-17.0, -11.0, 0.92], [-8.8, 0.3, 0.88], [-10.2, -3.0, 1.08],
  [-12.0, -6.2, 0.8], [-14.3, -8.7, 1.02], [-12.7, -11.5, 0.74],
  [1.2, -12.8, 0.82], [3.6, -16.8, 0.96],
];

const shrubPlacements: PlantPlacement[] = [
  [-8.7, -4.4, 1], [-8.1, -3.7, 0.8], [-7.7, -5.1, 1.15],
  [-5.8, -5.2, 0.9], [-4.8, -5.6, 1], [4.7, -5.5, 0.95],
  [5.8, -4.8, 1.1], [7.2, -4.2, 0.78], [8.2, -4.8, 1],
  [9.4, -3.9, 0.9], [10.7, -4.2, 1.05], [11.8, -5.1, 0.84],
  [12.7, -9.8, 1.05], [13.7, -10.2, 0.82], [14.8, -10.7, 1.1],
  [16.1, -11.2, 0.92], [17.3, -12.2, 0.86], [18.7, -13.1, 1.08],
  [20.1, -14.1, 0.92], [21.6, -14.5, 1.06], [23.4, -14.2, 0.86],
  [24.1, -16.9, 1.12], [22.8, -18.7, 0.9], [20.8, -20.3, 1.05],
  [-24.6, -18.5, 0.94], [-22.8, -20.2, 1.08], [-20.4, -20.5, 0.86],
  [-18.2, -19.2, 1.02], [-16.7, -17.4, 0.9], [-16.0, -14.5, 1.06],
  [-17.0, -11.0, 0.88], [-24.8, -12.5, 1.0],
  [-17.0, -12.2, 0.9], [-16.8, -13.5, 1.12], [-16.4, -16.9, 0.84],
  [-15.0, -18.2, 1.04], [-13.1, -20.1, 0.88], [-9.3, -20.0, 1.08],
  [-7.1, -17.9, 0.82], [-5.9, -16.3, 1.12], [-5.8, -12.8, 0.88],
  [-7.2, -10.7, 1.06], [-9.3, -8.2, 0.92], [-12.3, -7.3, 1.05],
  [-14.6, -8.5, 0.82], [-18.4, -10.2, 1.08], [-19.0, -17.9, 0.9],
  [-12.6, -11.0, 0.78], [-10.6, -10.4, 0.92], [-8.6, -12.0, 0.84],
  [-8.1, -15.9, 0.9], [-10.2, -17.9, 0.82], [-13.3, -17.4, 0.96],
  [-14.3, -14.7, 0.78], [-2.7, -8.5, 0.95], [-1.1, -10.2, 0.82],
  [1.0, -10.7, 1.04], [2.6, -12.1, 0.86], [4.0, -13.9, 1.02],
  [5.2, -15.5, 0.88],
];

function addGroundPatch(
  parent: THREE.Object3D,
  radius: number,
  position: [number, number],
  scale: [number, number],
  material: THREE.Material,
) {
  const patch = new THREE.Mesh(new THREE.CircleGeometry(radius, 64), material);
  patch.rotation.x = -Math.PI / 2;
  patch.scale.set(scale[0], scale[1], 1);
  patch.position.set(position[0], 0.224, position[1]);
  patch.receiveShadow = true;
  parent.add(patch);
}

function addPath(parent: THREE.Object3D, points: Array<[number, number]>, width: number) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const path = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, width, 8, false), pathStone);
  path.scale.y = 0.045;
  path.position.y = 0.238;
  path.receiveShadow = true;
  parent.add(path);
}

function addTrees(parent: THREE.Object3D) {
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.075, 0.105, 0.86, 7), trunkMaterial, treePlacements.length);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.54, 1), foliageMaterial, treePlacements.length);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);

  treePlacements.forEach(([x, z, size], index) => {
    quaternion.setFromAxisAngle(yAxis, index * 0.91);
    position.set(x, 0.58 * size, z);
    scale.set(size, size, size);
    matrix.compose(position, quaternion, scale);
    trunks.setMatrixAt(index, matrix);

    position.set(x, 1.34 * size, z);
    scale.set(size * 0.88, size * 1.18, size * 0.88);
    matrix.compose(position, quaternion, scale);
    crowns.setMatrixAt(index, matrix);
    crowns.setColorAt(index, new THREE.Color(index % 3 === 0 ? 0x5f8258 : index % 3 === 1 ? 0x789b6b : 0x688b60));
  });

  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
  trunks.castShadow = false;
  crowns.castShadow = true;
  parent.add(trunks, crowns);
}

function addShrubs(parent: THREE.Object3D) {
  const shrubs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.34, 1), shrubMaterial, shrubPlacements.length);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);

  shrubPlacements.forEach(([x, z, size], index) => {
    quaternion.setFromAxisAngle(yAxis, index * 0.67);
    position.set(x, 0.31 * size, z);
    scale.set(size * 1.18, size * 0.78, size);
    matrix.compose(position, quaternion, scale);
    shrubs.setMatrixAt(index, matrix);
    shrubs.setColorAt(index, new THREE.Color(index % 3 === 0 ? 0x698d5f : index % 3 === 1 ? 0x86a873 : 0x76976a));
  });

  shrubs.instanceMatrix.needsUpdate = true;
  if (shrubs.instanceColor) shrubs.instanceColor.needsUpdate = true;
  shrubs.castShadow = false;
  parent.add(shrubs);
}

function addGrassTufts(parent: THREE.Object3D) {
  const placements = shrubPlacements.filter((_, index) => index % 2 === 0);
  const tufts = new THREE.InstancedMesh(new THREE.ConeGeometry(0.16, 0.54, 5), grassMaterial, placements.length);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);

  placements.forEach(([x, z, size], index) => {
    quaternion.setFromAxisAngle(yAxis, index * 0.83);
    position.set(x + 0.42, 0.34 * size, z - 0.33);
    scale.set(size, size, size);
    matrix.compose(position, quaternion, scale);
    tufts.setMatrixAt(index, matrix);
    tufts.setColorAt(index, new THREE.Color(index % 2 ? 0x527948 : 0x72945d));
  });

  tufts.instanceMatrix.needsUpdate = true;
  if (tufts.instanceColor) tufts.instanceColor.needsUpdate = true;
  tufts.castShadow = false;
  parent.add(tufts);
}

export function createLandscape() {
  const landscape = new THREE.Group();
  addGroundPatch(landscape, 5.8, [-20.3, -15.4], [1.0, 0.9], meadow);
  addGroundPatch(landscape, 7.2, [11.5, -8.5], [1.35, 0.78], softMeadow);
  addGroundPatch(landscape, 8.4, [21, -16.4], [1.15, 0.82], meadow);
  addPath(landscape, [[-5.6, 2.8], [-8.4, -1.0], [-12.2, -5.0], [-16.4, -8.6], [-21.3, -11.7]], 0.42);
  addPath(landscape, [[4.6, -2.8], [6.8, -4.6], [8.4, -6.1]], 0.36);
  addPath(landscape, [[11.2, -8.2], [15.6, -11.4], [18.6, -14.2]], 0.38);
  addTrees(landscape);
  addShrubs(landscape);
  addGrassTufts(landscape);
  return landscape;
}
