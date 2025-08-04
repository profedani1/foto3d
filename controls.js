// controls.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';

let camPos = new THREE.Vector3(0, 0, 70);
let camPosTarget = camPos.clone();
let camYaw = 0;
let camPitch = 0;
const camPitchLimit = Math.PI / 2 - 0.1;
const moveSpeed = 0.5;
const camMouseSensitivity = 0.003;
const keys = {};
let isDragging = false;
let lastMouse = { x: 0, y: 0 };
let mousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

export function setupControls({ canvas }) {
  window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
  window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

  canvas.addEventListener("mousedown", e => {
    isDragging = true;
    lastMouse = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("mouseup", () => {
    isDragging = false;
    canvas.style.cursor = "grab";
  });
  canvas.addEventListener("mousemove", e => {
    mousePos = { x: e.clientX, y: e.clientY };
    if (isDragging) {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      camYaw -= dx * camMouseSensitivity;
      camPitch -= dy * camMouseSensitivity;
      camPitch = Math.max(-camPitchLimit, Math.min(camPitch, camPitch));
      lastMouse = { x: e.clientX, y: e.clientY };
    }
  });

  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    const zoomAmount = -e.deltaY * 0.1;
    const dir = getDirectionVector();
    camPosTarget.add(dir.multiplyScalar(zoomAmount));
  }, { passive: false });
}

export function moveCamera() {
  const forward = new THREE.Vector3(Math.cos(camPitch) * Math.sin(camYaw), 0, Math.cos(camPitch) * Math.cos(camYaw)).normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  if (keys['w']) camPosTarget.add(forward.clone().multiplyScalar(moveSpeed));
  if (keys['s']) camPosTarget.add(forward.clone().multiplyScalar(-moveSpeed));
  if (keys['a']) camPosTarget.add(right.clone().multiplyScalar(-moveSpeed));
  if (keys['d']) camPosTarget.add(right.clone().multiplyScalar(moveSpeed));
  if (keys[' ']) camPosTarget.y += moveSpeed;
  if (keys['shift']) camPosTarget.y -= moveSpeed;

  camPos.lerp(camPosTarget, 0.1);
}

export function getCameraMatrix() {
  const dir = getDirectionVector();
  const center = camPos.clone().add(dir);
  return {
    position: camPos.toArray(),
    center: center.toArray(),
    up: [0, 1, 0]
  };
}

function getDirectionVector() {
  return new THREE.Vector3(
    Math.cos(camPitch) * Math.sin(camYaw),
    Math.sin(camPitch),
    Math.cos(camPitch) * Math.cos(camYaw)
  );
}

const edgeSize = 150;
const autoLookSpeed = 0.02;

export function autoRotateByMouse() {
  if (isDragging) return;

  if (mousePos.x < edgeSize)
    camYaw += autoLookSpeed * ((edgeSize - mousePos.x) / edgeSize);
  else if (mousePos.x > window.innerWidth - edgeSize)
    camYaw -= autoLookSpeed * ((mousePos.x - (window.innerWidth - edgeSize)) / edgeSize);

  if (mousePos.y < edgeSize)
    camPitch += autoLookSpeed * ((edgeSize - mousePos.y) / edgeSize);
  else if (mousePos.y > window.innerHeight - edgeSize)
    camPitch -= autoLookSpeed * ((mousePos.y - (window.innerHeight - edgeSize)) / edgeSize);

  camPitch = Math.max(-camPitchLimit, Math.min(camPitch, camPitch));
}
