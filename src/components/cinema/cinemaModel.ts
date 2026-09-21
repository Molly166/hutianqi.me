import * as THREE from "three";
import { cinemaLandmark } from "@/data/landmarks";
import {
  createBox,
  markLandmark,
  sharedMaterial,
} from "@/components/map/modelUtils";

const oxblood = sharedMaterial(
  new THREE.MeshStandardMaterial({
    color: 0x6a3e40,
    roughness: 0.83,
  }),
);

const deepOxblood = sharedMaterial(
  new THREE.MeshStandardMaterial({
    color: 0x482d31,
    roughness: 0.78,
  }),
);

const ivory = sharedMaterial(
  new THREE.MeshStandardMaterial({
    color: 0xd7cfba,
    roughness: 0.9,
  }),
);

const darkGlass = sharedMaterial(
  new THREE.MeshStandardMaterial({
    color: 0x21383b,
    roughness: 0.24,
    metalness: 0.2,
  }),
);

const posterTeal = sharedMaterial(
  new THREE.MeshStandardMaterial({
    color: 0x477275,
    emissive: 0x315a5d,
    emissiveIntensity: 0.12,
    roughness: 0.36,
  }),
);

const brass = sharedMaterial(
  new THREE.MeshStandardMaterial({
    color: 0xb28a52,
    roughness: 0.48,
    metalness: 0.3,
  }),
);

const bulb = sharedMaterial(
  new THREE.MeshStandardMaterial({
    color: 0xe2b96f,
    emissive: 0xffc86d,
    emissiveIntensity: 0.45,
    roughness: 0.35,
  }),
);

const pavement = sharedMaterial(
  new THREE.MeshStandardMaterial({
    color: 0xa9a28f,
    roughness: 0.96,
  }),
);

function addEntrance(parent: THREE.Object3D) {
  createBox(parent, [2.05, 2.18, 0.12], [0, 1.48, 2.19], darkGlass, false);
  createBox(parent, [0.08, 2.2, 0.14], [0, 1.48, 2.26], brass);
  createBox(parent, [2.18, 0.1, 0.14], [0, 2.58, 2.26], brass);
  createBox(parent, [2.18, 0.1, 0.14], [0, 0.39, 2.26], brass);
  createBox(parent, [0.1, 2.2, 0.14], [-1.07, 1.48, 2.26], brass);
  createBox(parent, [0.1, 2.2, 0.14], [1.07, 1.48, 2.26], brass);
  createBox(parent, [0.16, 0.05, 0.08], [-0.2, 1.48, 2.34], brass, false);
  createBox(parent, [0.16, 0.05, 0.08], [0.2, 1.48, 2.34], brass, false);
}

function addPosterBox(parent: THREE.Object3D, x: number) {
  createBox(parent, [1.26, 1.76, 0.14], [x, 1.56, 2.18], brass);
  createBox(parent, [1.04, 1.52, 0.08], [x, 1.56, 2.3], posterTeal, false);
  createBox(parent, [0.7, 0.06, 0.04], [x, 1.25, 2.36], ivory, false);
  createBox(parent, [0.48, 0.06, 0.04], [x - 0.15, 1.58, 2.36], ivory, false);
  createBox(parent, [0.58, 0.06, 0.04], [x + 0.08, 1.88, 2.36], ivory, false);
}

function addMarquee(parent: THREE.Object3D) {
  createBox(parent, [4.78, 0.3, 1.22], [0, 2.88, 2.62], ivory);
  createBox(parent, [4.94, 0.12, 1.34], [0, 3.08, 2.62], deepOxblood);
  createBox(parent, [4.88, 0.12, 0.12], [0, 2.72, 3.22], brass);

  const geometry = new THREE.SphereGeometry(0.075, 10, 8);
  const bulbs = new THREE.InstancedMesh(geometry, bulb, 11);
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < 11; index += 1) {
    matrix.makeTranslation(-2.15 + index * 0.43, 2.7, 3.31);
    bulbs.setMatrixAt(index, matrix);
  }
  bulbs.instanceMatrix.needsUpdate = true;
  bulbs.castShadow = false;
  bulbs.receiveShadow = false;
  parent.add(bulbs);
}

function addCinemaWordmark(parent: THREE.Object3D) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return;

  context.fillStyle = "#482d31";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#b28a52";
  context.lineWidth = 10;
  context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  context.fillStyle = "#f0dca8";
  context.font = "700 78px 'Avenir Next', 'Helvetica Neue', sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.letterSpacing = "12px";
  context.fillText("CINEMA", canvas.width / 2 + 6, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.28, 0.56), material);
  sign.position.set(0, 2.9, 3.295);
  sign.castShadow = false;
  sign.receiveShadow = false;
  parent.add(sign);
}

function addReel(parent: THREE.Object3D, x: number, y: number, radius: number) {
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 36), brass);
  disc.position.set(x, y, 0.03);
  disc.castShadow = false;
  parent.add(disc);

  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.2, 18),
    deepOxblood,
  );
  inner.position.set(x, y, 0.052);
  parent.add(inner);

  for (let index = 0; index < 5; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / 5;
    const hole = new THREE.Mesh(
      new THREE.CircleGeometry(radius * 0.18, 16),
      deepOxblood,
    );
    hole.position.set(
      x + Math.cos(angle) * radius * 0.56,
      y + Math.sin(angle) * radius * 0.56,
      0.055,
    );
    parent.add(hole);
  }
}

function addProjectorSign(parent: THREE.Object3D) {
  const projector = new THREE.Group();
  projector.position.set(0, 5.12, 2.43);

  createBox(projector, [1.82, 0.76, 0.12], [0, -0.5, 0], deepOxblood, false);
  createBox(projector, [1.48, 0.5, 0.08], [0, -0.5, 0.08], brass, false);
  addReel(projector, -0.48, 0.28, 0.64);
  addReel(projector, 0.58, 0.26, 0.52);

  const lensGeometry = new THREE.BufferGeometry();
  lensGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        0, -0.3, 0,
        0, 0.3, 0,
        0.58, 0, 0,
      ],
      3,
    ),
  );
  lensGeometry.computeVertexNormals();
  const lens = new THREE.Mesh(lensGeometry, brass);
  lens.position.set(0.9, -0.46, 0.08);
  projector.add(lens);

  createBox(projector, [0.1, 0.42, 0.1], [-0.28, -1.08, 0], brass, false);
  createBox(projector, [1.15, 0.09, 0.14], [-0.28, -1.28, 0], brass, false);
  parent.add(projector);
}

export function createCinema() {
  const cinema = new THREE.Group();
  cinema.rotation.y = -0.1;

  createBox(cinema, [6.45, 0.28, 5.2], [0, 0.14, 0.32], pavement);
  createBox(cinema, [6.0, 0.36, 4.25], [0, 0.46, 0], deepOxblood);
  createBox(cinema, [5.68, 3.72, 3.9], [0, 2.49, -0.08], oxblood);

  createBox(cinema, [2.42, 5.18, 0.64], [0, 3.22, 1.96], ivory);
  createBox(cinema, [2.02, 0.34, 0.8], [0, 5.86, 1.96], oxblood);
  createBox(cinema, [1.56, 0.3, 0.92], [0, 6.18, 1.96], ivory);
  createBox(cinema, [1.06, 0.26, 1.02], [0, 6.46, 1.96], brass);

  for (const x of [-2.53, 2.53]) {
    createBox(cinema, [0.24, 3.54, 0.34], [x, 2.46, 2.0], ivory);
    createBox(cinema, [0.14, 3.22, 0.18], [x * 0.78, 2.42, 2.13], brass);
  }

  addEntrance(cinema);
  addPosterBox(cinema, -1.86);
  addPosterBox(cinema, 1.86);
  addMarquee(cinema);
  addCinemaWordmark(cinema);
  addProjectorSign(cinema);

  const entranceLight = new THREE.PointLight(0xffc86d, 0.2, 6.5, 2);
  entranceLight.position.set(0, 2.7, 3.2);
  cinema.add(entranceLight);

  const markedCinema = markLandmark(cinema, cinemaLandmark);
  markedCinema.userData.setHovered = (hovered: boolean) => {
    bulb.emissiveIntensity = hovered ? 1.7 : 0.45;
    posterTeal.emissiveIntensity = hovered ? 0.42 : 0.12;
    entranceLight.intensity = hovered ? 1.35 : 0.2;
  };
  return markedCinema;
}
