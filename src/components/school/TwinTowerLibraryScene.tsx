"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useJourneyTransition } from "@/components/journey/JourneyTransitionProvider";
import { schoolLandmark } from "@/data/landmarks";
import { createLibrary, createTree } from "@/components/school/libraryModel";

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
  const activateSchoolRef = useRef<(() => void) | null>(null);
  const transitionStartedRef = useRef(false);
  const { beginJourney } = useJourneyTransition();

  const activateSchoolFromKeyboard = () => {
    activateSchoolRef.current?.();
  };

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
    let pointerPress: {
      id: number;
      x: number;
      y: number;
      time: number;
      startedOnSchool: boolean;
    } | null = null;

    const clearHover = () => {
      if (!hoverOverlay.visible && !hoverLight.visible) return;
      hoverOverlay.visible = false;
      hoverLight.visible = false;
      hoveredPart = "";
      renderScene();
    };

    const getSchoolHit = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return undefined;

      pointer.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(hoverTargets, false)[0];
    };

    const updateHoverAt = (clientX: number, clientY: number) => {
      const hit = getSchoolHit(clientX, clientY);
      if (!hit || !(hit.object instanceof THREE.Mesh)) {
        renderer.domElement.style.cursor = "grab";
        clearHover();
        return;
      }

      renderer.domElement.style.cursor = "pointer";

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

    const startSchoolDeparture = () => {
      if (transitionStartedRef.current) return;
      transitionStartedRef.current = true;
      controls.enabled = false;
      pointerInside = false;
      clearHover();
      renderer.domElement.style.cursor = "default";
      beginJourney({
        href: schoolLandmark.href,
        label: `正在进入${schoolLandmark.title}`,
      });
    };

    activateSchoolRef.current = startSchoolDeparture;

    const updateHover = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      pointerInside = true;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!isOrbiting) updateHoverAt(pointerX, pointerY);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) {
        return;
      }
      pointerPress = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
        startedOnSchool: Boolean(getSchoolHit(event.clientX, event.clientY)),
      };
    };

    const handlePointerUp = (event: PointerEvent) => {
      const press = pointerPress;
      pointerPress = null;
      if (!press || press.id !== event.pointerId || !press.startedOnSchool) return;

      const travel = Math.hypot(event.clientX - press.x, event.clientY - press.y);
      const duration = performance.now() - press.time;
      if (travel > 7 || duration > 700) return;
      if (!getSchoolHit(event.clientX, event.clientY)) return;

      startSchoolDeparture();
    };

    const handlePointerLeave = () => {
      pointerPress = null;
      pointerInside = false;
      clearHover();
    };

    const handlePointerCancel = () => {
      pointerPress = null;
      handlePointerLeave();
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
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave);
    renderer.domElement.addEventListener("pointercancel", handlePointerCancel);
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
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
      renderer.domElement.removeEventListener("pointercancel", handlePointerCancel);
      if (frame) cancelAnimationFrame(frame);
      activateSchoolRef.current = null;
      transitionStartedRef.current = false;
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
  }, [beginJourney]);

  return (
    <main className="school-scene">
      <h1 className="sr-only" data-journey-heading tabIndex={-1}>
        人生地图
      </h1>
      <div className="school-scene__canvas" ref={mountRef} />
      <button
        type="button"
        className="school-entry-shortcut"
        onClick={activateSchoolFromKeyboard}
      >
        进入中南民族大学经历
      </button>
    </main>
  );
}
