import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';

let camPos = new THREE.Vector3(0,0,10);
let camPosTarget = camPos.clone();
let camYaw = Math.PI;
let camPitch = 0;
const camPitchLimit = Math.PI/2 - 0.1;

let isDraggingSphere = false;
let lastMouse = {x:0, y:0};
let mousePos = {x: window.innerWidth/2, y: window.innerHeight/2};

let lastTouchDist = null;
let lastTouchMidpoint = null;
let isTouchRotating = false;

const sphereDragSensitivity = 0.005;
const camMouseSensitivity = 0.002;
const moveSpeed = 0.1;

const keys = {};

let sphere = null;
let positionAttribute = null;
let vertexCount = 0;
let basePositions = null;
let radius = 3;
let boxSize = 20;

// Variables para rotación manual de esfera (del original)
let sphereAngleY = 0;
let sphereAngleX = 0;
const sphereLimit = Math.PI/2 - 0.1;

export function setSphereData({ sphere: s, geometry, radius: r, boxSize: b }) {
  sphere = s;
  radius = r;
  boxSize = b;

  positionAttribute = geometry.attributes.position;
  vertexCount = positionAttribute.count;
  basePositions = new Float32Array(positionAttribute.array);

  // Inicializa rotación
  sphereAngleY = sphere.rotation.y;
  sphereAngleX = sphere.rotation.x;
}

export function setupControls({ scene, camera, renderer }) {
  window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
  window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

  renderer.domElement.addEventListener('mousedown', e => {
    isDraggingSphere = true;
    lastMouse.x = e.clientX;
    lastMouse.y = e.clientY;
  });
  renderer.domElement.addEventListener('mouseup', e => { isDraggingSphere = false; });
  renderer.domElement.addEventListener('mouseleave', e => { isDraggingSphere = false; });

  renderer.domElement.addEventListener('mousemove', e => {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;

    if(isDraggingSphere && sphere) {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;

      sphereAngleY += dx * sphereDragSensitivity;
      sphereAngleX += dy * sphereDragSensitivity;
      sphereAngleX = Math.max(-sphereLimit, Math.min(sphereAngleX, sphereLimit));

      sphere.rotation.y = sphereAngleY;
      sphere.rotation.x = sphereAngleX;

      lastMouse.x = e.clientX;
      lastMouse.y = e.clientY;
    } else {
      const dx = e.movementX || e.clientX - lastMouse.x;
      const dy = e.movementY || e.clientY - lastMouse.y;

      camYaw -= dx * camMouseSensitivity;
      camPitch -= dy * camMouseSensitivity;
      camPitch = Math.max(-camPitchLimit, Math.min(camPitch, camPitch));

      lastMouse.x = e.clientX;
      lastMouse.y = e.clientY;
    }
  });

  // Manejo táctil igual que antes, adaptado para sphereAngle
  renderer.domElement.addEventListener('touchstart', e => {
    e.preventDefault();
    if(e.touches.length === 1) {
      isTouchRotating = true;
      lastMouse.x = e.touches[0].clientX;
      lastMouse.y = e.touches[0].clientY;
    } else if(e.touches.length === 2) {
      isTouchRotating = false;
      lastTouchDist = getTouchDist(e.touches);
      lastTouchMidpoint = getTouchMidpoint(e.touches);
    }
  }, {passive: false});

  renderer.domElement.addEventListener('touchmove', e => {
    e.preventDefault();
    if(e.touches.length === 1 && isTouchRotating && sphere) {
      const dx = e.touches[0].clientX - lastMouse.x;
      const dy = e.touches[0].clientY - lastMouse.y;

      sphereAngleY += dx * sphereDragSensitivity * 2;
      sphereAngleX += dy * sphereDragSensitivity * 2;
      sphereAngleX = Math.max(-sphereLimit, Math.min(sphereAngleX, sphereLimit));

      sphere.rotation.y = sphereAngleY;
      sphere.rotation.x = sphereAngleX;

      lastMouse.x = e.touches[0].clientX;
      lastMouse.y = e.touches[0].clientY;

      mousePos.x = e.touches[0].clientX;
      mousePos.y = e.touches[0].clientY;
    } else if(e.touches.length === 2) {
      const newDist = getTouchDist(e.touches);
      const newMid = getTouchMidpoint(e.touches);

      const zoomDelta = (newDist - lastTouchDist) * 0.01;
      const lookDir = new THREE.Vector3(
        Math.cos(camPitch)*Math.sin(camYaw),
        Math.sin(camPitch),
        Math.cos(camPitch)*Math.cos(camYaw)
      );

      camPosTarget.add(lookDir.multiplyScalar(zoomDelta));

      const limit = boxSize/2 - 0.5;
      camPosTarget.x = Math.min(limit, Math.max(-limit, camPosTarget.x));
      camPosTarget.y = Math.min(limit, Math.max(-limit, camPosTarget.y));
      camPosTarget.z = Math.min(limit, Math.max(-limit, camPosTarget.z));

      lastTouchDist = newDist;
      lastTouchMidpoint = newMid;

      mousePos.x = newMid.x;
      mousePos.y = newMid.y;
    }
  }, {passive: false});

  renderer.domElement.addEventListener('touchend', e => {
    e.preventDefault();
    if(e.touches.length === 0) {
      isTouchRotating = false;
      lastTouchDist = null;
      lastTouchMidpoint = null;
    }
  }, {passive: false});

  function getTouchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx*dx + dy*dy);
  }

  function getTouchMidpoint(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  }

  // Zoom cámara rueda
  window.addEventListener('wheel', e => {
    e.preventDefault();

    const zoomSpeed = 0.005;
    const zoomAmount = -e.deltaY * zoomSpeed;

    const lookDir = new THREE.Vector3(
      Math.cos(camPitch)*Math.sin(camYaw),
      Math.sin(camPitch),
      Math.cos(camPitch)*Math.cos(camYaw)
    );

    camPosTarget.add(lookDir.multiplyScalar(zoomAmount));

    const limit = boxSize/2 - 0.5;
    camPosTarget.x = Math.min(limit, Math.max(-limit, camPosTarget.x));
    camPosTarget.y = Math.min(limit, Math.max(-limit, camPosTarget.y));
    camPosTarget.z = Math.min(limit, Math.max(-limit, camPosTarget.z));
  }, { passive: false });
}

export function updateCamera({ camera }) {
  camera.position.copy(camPos);

  const dir = new THREE.Vector3(
    Math.cos(camPitch)*Math.sin(camYaw),
    Math.sin(camPitch),
    Math.cos(camPitch)*Math.cos(camYaw)
  );

  camera.lookAt(camPos.clone().add(dir));
}

export function moveCamera() {
  const forward = new THREE.Vector3(
    Math.cos(camPitch)*Math.sin(camYaw),
    0,
    Math.cos(camPitch)*Math.cos(camYaw)
  ).normalize();

  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).normalize();

  if(keys['w']) { camPosTarget.add(forward.clone().multiplyScalar(moveSpeed)); }
  if(keys['s']) { camPosTarget.add(forward.clone().multiplyScalar(-moveSpeed)); }
  if(keys['a']) { camPosTarget.add(right.clone().multiplyScalar(-moveSpeed)); }
  if(keys['d']) { camPosTarget.add(right.clone().multiplyScalar(moveSpeed)); }

  if(keys[' ']) camPosTarget.y += moveSpeed;
  if(keys['shift']) camPosTarget.y -= moveSpeed;

  const limit = boxSize/2 - 0.5;
  camPosTarget.x = Math.min(limit, Math.max(-limit, camPosTarget.x));
  camPosTarget.y = Math.min(limit, Math.max(-limit, camPosTarget.y));
  camPosTarget.z = Math.min(limit, Math.max(-limit, camPosTarget.z));

  camPos.lerp(camPosTarget, 0.1);
}

const edgeSize = 150;
const autoLookSpeed = 0.02000;

export function autoRotateViewByMousePosition() {
  if(isDraggingSphere || isTouchRotating) return;

  if(mousePos.x < edgeSize) {
    let intensity = (edgeSize - mousePos.x) / edgeSize;
    camYaw += autoLookSpeed * intensity;
  } else if(mousePos.x > window.innerWidth - edgeSize) {
    let intensity = (mousePos.x - (window.innerWidth - edgeSize)) / edgeSize;
    camYaw -= autoLookSpeed * intensity;
  }

  if(mousePos.y < edgeSize) {
    let intensity = (edgeSize - mousePos.y) / edgeSize;
    camPitch += autoLookSpeed * intensity;
  } else if(mousePos.y > window.innerHeight - edgeSize) {
    let intensity = (mousePos.y - (window.innerHeight - edgeSize)) / edgeSize;
   