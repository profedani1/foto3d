let camPos = [0, 0, 70];
let camYaw = 0, camPitch = 0;
let camPosTarget = [...camPos];
const camPitchLimit = Math.PI / 2 - 0.01;
const moveSpeed = 0.5;
const camMouseSensitivity = 0.003;
const keys = {};

let mousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let isDragging = false;
let lastMouse = { x: 0, y: 0 };
let isLocked = false;
let mouseButtons = new Set();

function setupControls(canvas) {
  window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
  window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

  canvas.addEventListener("mousedown", e => {
    mouseButtons.add(e.button);
    if (mouseButtons.has(0) && mouseButtons.has(2)) {
      isLocked = true;
      canvas.style.cursor = "not-allowed";
    } else {
      isDragging = true;
      lastMouse = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = "grabbing";
    }
  });

  canvas.addEventListener("mouseup", e => {
    mouseButtons.delete(e.button);
    if (!(mouseButtons.has(0) && mouseButtons.has(2))) {
      isLocked = false;
      isDragging = false;
      canvas.style.cursor = "grab";
    }
  });

  canvas.addEventListener("contextmenu", e => {
    e.preventDefault(); // Evita menú contextual
  });

  canvas.addEventListener("mousemove", e => {
    mousePos = { x: e.clientX, y: e.clientY };
    if (isDragging && !isLocked) {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      camYaw -= dx * camMouseSensitivity;
      camPitch -= dy * camMouseSensitivity;
      camPitch = Math.max(-camPitchLimit, Math.min(camPitchLimit, camPitch));
      lastMouse = { x: e.clientX, y: e.clientY };
    }
  });

  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    const zoom = -e.deltaY * 0.02; // Zoom más suave
    const fx = Math.cos(camPitch) * Math.sin(camYaw);
    const fy = Math.sin(camPitch);
    const fz = Math.cos(camPitch) * Math.cos(camYaw);
    camPosTarget[0] += fx * zoom;
    camPosTarget[1] += fy * zoom;
    camPosTarget[2] += fz * zoom;
  }, { passive: false });
}

function moveCamera() {
  const forward = [Math.cos(camPitch)*Math.sin(camYaw), 0, Math.cos(camPitch)*Math.cos(camYaw)];
  const right = [Math.sin(camYaw - Math.PI/2), 0, Math.cos(camYaw - Math.PI/2)];

  if (keys['w']) { camPosTarget[0] += forward[0]*moveSpeed; camPosTarget[2] += forward[2]*moveSpeed; }
  if (keys['s']) { camPosTarget[0] -= forward[0]*moveSpeed; camPosTarget[2] -= forward[2]*moveSpeed; }
  if (keys['a']) { camPosTarget[0] -= right[0]*moveSpeed; camPosTarget[2] -= right[2]*moveSpeed; }
  if (keys['d']) { camPosTarget[0] += right[0]*moveSpeed; camPosTarget[2] += right[2]*moveSpeed; }
  if (keys[' ']) camPosTarget[1] += moveSpeed;
  if (keys['shift']) camPosTarget[1] -= moveSpeed;

  for (let i = 0; i < 3; i++) {
    camPosTarget[i] = Math.min(200, Math.max(-200, camPosTarget[i]));
    camPos[i] += (camPosTarget[i] - camPos[i]) * 0.1;
  }
}

const edgeSize = 150;

function moveCameraByMouseEdges() {
  if (isDragging || isLocked) return;

  if (mousePos.x < edgeSize) {
    camPosTarget[0] -= moveSpeed; // Mover a la izquierda (X-)
  } else if (mousePos.x > window.innerWidth - edgeSize) {
    camPosTarget[0] += moveSpeed; // Mover a la derecha (X+)
  }

  if (mousePos.y < edgeSize) {
    camPosTarget[1] += moveSpeed; // Subir (Y+)
  } else if (mousePos.y > window.innerHeight - edgeSize) {
    camPosTarget[1] -= moveSpeed; // Bajar (Y-)
  }
}

function createViewMatrix(pos = camPos, yaw = camYaw, pitch = camPitch) {
  const cx = Math.cos(pitch) * Math.sin(yaw);
  const cy = Math.sin(pitch);
  const cz = Math.cos(pitch) * Math.cos(yaw);
  return lookAt(pos, [pos[0]+cx, pos[1]+cy, pos[2]+cz], [0,1,0]);
}

// Dependencia: lookAt
function normalize(v) {
  const len = Math.hypot(...v);
  return v.map(x => x / len);
}
function subtract(a, b) {
  return a.map((x, i) => x - b[i]);
}
function cross(a, b) {
  return [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0]
  ];
}
function dot(a, b) {
  return a.reduce((sum, x, i) => sum + x * b[i], 0);
}
function lookAt(eye, center, up) {
  const f = normalize(subtract(center, eye));
  const s = normalize(cross(f, up));
  const u = cross(s, f);
  return new Float32Array([
    s[0], u[0], -f[0], 0,
    s[1], u[1], -f[1], 0,
    s[2], u[2], -f[2], 0,
    -dot(s, eye), -dot(u, eye), dot(f, eye), 1,
  ]);
}

export {
  setupControls,
  moveCamera,
  moveCameraByMouseEdges,
  createViewMatrix
};
