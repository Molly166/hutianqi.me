"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const schoolLandmark = {
  id: "school-scuec",
  type: "school",
  name: "中南民族大学",
  landmark: "双子塔图书馆",
} as const;

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

const trunkMaterial = new THREE.MeshStandardMaterial({
  color: 0x5c4937,
  roughness: 1,
});

const foliageMaterial = new THREE.MeshStandardMaterial({
  color: 0x476b55,
  roughness: 0.95,
});

const sharedMaterials = [
  ivory,
  paleStone,
  roofGreen,
  darkGlass,
  windowGlass,
  trunkMaterial,
  foliageMaterial,
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

function createLibrary() {
  const building = new THREE.Group();
  building.name = schoolLandmark.id;
  building.userData.landmark = schoolLandmark;
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

  for (const x of [-4.58, 4.58]) {
    box(building, [1.0, 0.62, 1.15], [x, 2.02, 0.1], ivory);
    addRoof(building, [x, 2.32, 0.1], 1.25, 1.34, 0.26);
  }

  building.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.userData.landmarkId = schoolLandmark.id;
      child.userData.landmarkType = schoolLandmark.type;
      child.userData.hoverable = true;
    }
  });

  return building;
}

function createTree(x: number, z: number, scale = 1) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.09, 0.78, 7),
    trunkMaterial,
  );
  trunk.position.y = 0.62;
  trunk.castShadow = true;
  tree.add(trunk);

  const crown = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.48, 1),
    foliageMaterial,
  );
  crown.scale.set(0.85, 1.2, 0.85);
  crown.position.y = 1.25;
  crown.castShadow = true;
  tree.add(crown);
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);
  return tree;
}

function buildWorld(scene: THREE.Scene) {
  const world = new THREE.Group();
  world.position.y = -0.12;

  const water = new THREE.Mesh(
    new THREE.CircleGeometry(64, 128),
    new THREE.MeshStandardMaterial({
      color: 0x78999a,
      roughness: 0.33,
      metalness: 0.08,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(8, -0.42, -8);
  water.receiveShadow = true;
  world.add(water);

  const terrain = new THREE.Mesh(
    new THREE.CylinderGeometry(30, 30.8, 0.58, 96),
    new THREE.MeshStandardMaterial({ color: 0x64835d, roughness: 0.95 }),
  );
  terrain.scale.set(1.26, 1, 0.84);
  terrain.position.set(12, -0.08, -10);
  terrain.receiveShadow = true;
  world.add(terrain);

  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(5.1, 64),
    new THREE.MeshStandardMaterial({ color: 0xbab29f, roughness: 0.92 }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.scale.set(1.45, 0.72, 1);
  plaza.position.set(0, 0.225, 3.15);
  plaza.receiveShadow = true;
  world.add(plaza);

  const library = createLibrary();
  library.position.set(0, 0.22, -0.2);
  world.add(library);

  const treePositions: Array<[number, number, number]> = [
    [-7.2, -2.8, 1.05], [-6.8, -0.7, 0.9], [-6.4, 1.55, 1.15],
    [-5.9, 3.4, 0.82], [6.9, -2.7, 1.08], [6.5, -0.6, 0.88],
    [6.2, 1.8, 1.02], [5.7, 3.65, 0.78], [-3.9, -4.15, 0.74],
    [3.8, -4.25, 0.8],
  ];
  treePositions.forEach(([x, z, scale]) => world.add(createTree(x, z, scale)));

  scene.add(world);
  return { world, school: library };
}

export default function TwinTowerLibraryScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.setAttribute(
      "aria-label",
      "中南民族大学双子塔图书馆三维模型，可拖动旋转并缩放",
    );
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb8c9c6);
    scene.fog = new THREE.Fog(0xb8c9c6, 21, 42);

    const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
    camera.position.set(15.5, 11.8, 17.5);
    camera.lookAt(0, 4.2, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.85, 0);
    controls.enablePan = false;
    controls.enableDamping = false;
    controls.minZoom = 0.72;
    controls.maxZoom = 1.85;
    controls.minPolarAngle = Math.PI * 0.22;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minAzimuthAngle = -Math.PI * 0.48;
    controls.maxAzimuthAngle = Math.PI * 0.48;

    scene.add(new THREE.HemisphereLight(0xe5efec, 0x627065, 2.0));

    const sun = new THREE.DirectionalLight(0xfff3d9, 3.7);
    sun.position.set(-8, 18, 11);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.left = -15;
    sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 17;
    sun.shadow.camera.bottom = -10;
    sun.shadow.bias = -0.0004;
    scene.add(sun);

    const { world, school } = buildWorld(scene);

    let frame = 0;
    const renderScene = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        renderer.render(scene, camera);
        frame = 0;
      });
    };

    const hoverTargets: THREE.Mesh[] = [];
    school.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.hoverable) {
        hoverTargets.push(child);
      }
    });

    const hoverMaterial = new THREE.MeshBasicMaterial({
      color: 0xe5f2c4,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      toneMapped: false,
    });
    const emptyHoverGeometry = new THREE.BufferGeometry();
    const hoverOverlay = new THREE.Mesh(emptyHoverGeometry, hoverMaterial);
    hoverOverlay.visible = false;
    hoverOverlay.renderOrder = 4;
    scene.add(hoverOverlay);

    const hoverLight = new THREE.PointLight(0xeaf6cb, 2.6, 3.4, 2);
    hoverLight.visible = false;
    scene.add(hoverLight);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const instanceMatrix = new THREE.Matrix4();
    const hoverMatrix = new THREE.Matrix4();
    const hoverPosition = new THREE.Vector3();
    const hoverQuaternion = new THREE.Quaternion();
    const hoverScale = new THREE.Vector3();
    const lightOffset = new THREE.Vector3();
    let hoveredPart = "";
    let isOrbiting = false;
    let pointerInside = false;
    let pointerX = 0;
    let pointerY = 0;

    const clearHover = () => {
      if (!hoverOverlay.visible && !hoverLight.visible) return;
      hoverOverlay.visible = false;
      hoverLight.visible = false;
      hoveredPart = "";
      renderScene();
    };

    const updateHoverAt = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      pointer.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);

      const hit = raycaster.intersectObjects(hoverTargets, false)[0];
      if (!hit || !(hit.object instanceof THREE.Mesh)) {
        clearHover();
        return;
      }

      const part = hit.object;
      const instanceId = hit.instanceId ?? -1;
      const partKey = `${part.uuid}:${instanceId}`;

      lightOffset.subVectors(camera.position, hit.point).normalize();
      hoverLight.position.copy(hit.point).addScaledVector(lightOffset, 0.32);
      hoverLight.visible = true;

      if (partKey !== hoveredPart) {
        part.updateWorldMatrix(true, false);
        hoverMatrix.copy(part.matrixWorld);
        if (part instanceof THREE.InstancedMesh && instanceId >= 0) {
          part.getMatrixAt(instanceId, instanceMatrix);
          hoverMatrix.multiply(instanceMatrix);
        }

        hoverMatrix.decompose(hoverPosition, hoverQuaternion, hoverScale);
        hoverOverlay.geometry = part.geometry;
        hoverOverlay.position.copy(hoverPosition);
        hoverOverlay.quaternion.copy(hoverQuaternion);
        hoverOverlay.scale.copy(hoverScale).multiplyScalar(1.018);
        hoverOverlay.visible = true;
        hoveredPart = partKey;
      }

      renderScene();
    };

    const updateHover = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      pointerInside = true;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!isOrbiting) updateHoverAt(pointerX, pointerY);
    };

    const handlePointerLeave = () => {
      pointerInside = false;
      clearHover();
    };

    const handleControlsStart = () => {
      isOrbiting = true;
      clearHover();
    };

    const handleControlsEnd = () => {
      isOrbiting = false;
      if (pointerInside) updateHoverAt(pointerX, pointerY);
    };

    renderer.domElement.addEventListener("pointermove", updateHover);
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave);
    renderer.domElement.addEventListener("pointercancel", handlePointerLeave);
    controls.addEventListener("start", handleControlsStart);
    controls.addEventListener("end", handleControlsEnd);

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      if (!width || !height) return;
      const aspect = width / height;
      const baseViewHeight = height < 650 ? 18 : 17.5;
      const viewHeight = Math.min(
        24,
        Math.max(baseViewHeight, 11 / aspect),
      );
      const viewWidth = viewHeight * aspect;
      const modelScale = aspect < 0.72 ? 0.28 : aspect < 1 ? 0.34 : 0.42;
      world.scale.setScalar(modelScale);
      camera.left = -viewWidth * 0.26;
      camera.right = viewWidth * 0.74;
      camera.top = viewHeight * 0.72;
      camera.bottom = -viewHeight * 0.28;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
      renderer.setSize(width, height, false);
      renderScene();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    controls.addEventListener("change", renderScene);
    resize();
    controls.update();
    renderScene();

    return () => {
      observer.disconnect();
      controls.removeEventListener("change", renderScene);
      controls.removeEventListener("start", handleControlsStart);
      controls.removeEventListener("end", handleControlsEnd);
      controls.dispose();
      renderer.domElement.removeEventListener("pointermove", updateHover);
      renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
      renderer.domElement.removeEventListener("pointercancel", handlePointerLeave);
      if (frame) cancelAnimationFrame(frame);
      scene.remove(hoverOverlay);
      scene.remove(hoverLight);
      emptyHoverGeometry.dispose();
      hoverMaterial.dispose();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => {
          if (!material.userData.shared) material.dispose();
        });
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <main className="school-scene">
      <div className="school-scene__canvas" ref={mountRef} />
    </main>
  );
}
