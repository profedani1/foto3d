// main.js (ES module)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js";
import { createReliefScene } from "./relieve.js";

let renderer, camera;
let currentScene = null;
let currentAnimate = null;
let animationId = null;

const canvasContainer = document.body;

function initRendererAndCamera() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  canvasContainer.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 10);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function cleanupCurrentScene() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  if (currentScene) {
    currentScene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    currentScene.clear();
    currentScene = null;
  }
}

// Escena vacía por defecto
function createEmptyScene() {
  const scene = new THREE.Scene();
  function animate() {
    animationId = requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  return { scene, animate };
}

// Escena de esfera (opcional, puedes moverla a otro módulo también si deseas)
function createSphereScene() {
  const scene = new THREE.Scene();

  const light = new THREE.PointLight(0x00ffff, 50);
  light.position.set(10, 10, 10);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  const geometry = new THREE.SphereGeometry(3, 100, 100);
  const material = new THREE.ShaderMaterial({
    wireframe: true,
    vertexShader: `
      varying vec3 vPosition;
      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPosition;
      vec3 magenta = vec3(1.0,0.0,1.0);
      vec3 cyan = vec3(0.0,1.0,1.0);
      void main() {
        float mixValue = (vPosition.x + 3.0) / 6.0;
        vec3 color = mix(magenta, cyan, mixValue);
        gl_FragColor = vec4(color,1.0);
      }
    `,
  });

  const sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(20, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
  );
  scene.add(box);

  let angleY = 0;
  let angleX = 0;
  const limit = Math.PI / 2 - 0.1;
  let isDragging = false;
  let lastMouse = { x: 0, y: 0 };

  renderer.domElement.addEventListener("mousedown", (e) => {
    isDragging = true;
    lastMouse.x = e.clientX;
    lastMouse.y = e.clientY;
  });
  renderer.domElement.addEventListener("mouseup", () => {
    isDragging = false;
  });
  renderer.domElement.addEventListener("mousemove", (e) => {
    if (isDragging) {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      angleY += dx * 0.005;
      angleX += dy * 0.005;
      angleX = Math.max(-limit, Math.min(angleX, limit));
      sphere.rotation.set(angleX, angleY, 0);
      lastMouse.x = e.clientX;
      lastMouse.y = e.clientY;
    }
  });

  function animate() {
    animationId = requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }

  return { scene, animate };
}

// Escena cuadrado
function createSquareScene() {
  const scene = new THREE.Scene();

  const light = new THREE.PointLight(0xff00ff, 2);
  light.position.set(10, 10, 10);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true })
  );
  scene.add(plane);

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(20, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
  );
  scene.add(box);

  let angleY = 0;
  let angleX = 0;
  const limit = Math.PI / 2 - 0.1;
  let isDragging = false;
  let lastMouse = { x: 0, y: 0 };

  renderer.domElement.addEventListener("mousedown", (e) => {
    isDragging = true;
    lastMouse.x = e.clientX;
    lastMouse.y = e.clientY;
  });
  renderer.domElement.addEventListener("mouseup", () => {
    isDragging = false;
  });
  renderer.domElement.addEventListener("mousemove", (e) => {
    if (isDragging) {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      angleY += dx * 0.005;
      angleX += dy * 0.005;
      angleX = Math.max(-limit, Math.min(angleX, limit));
      plane.rotation.set(angleX, angleY, 0);
      lastMouse.x = e.clientX;
      lastMouse.y = e.clientY;
    }
  });

  function animate() {
    animationId = requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }

  return { scene, animate };
}

// Controlador de escenas
function switchScene(name) {
  cleanupCurrentScene();
  if (!renderer || !camera) initRendererAndCamera();

  if (name === "esfera") {
    const { scene, animate } = createSphereScene();
    currentScene = scene;
    currentAnimate = animate;
  } else if (name === "cuadrado") {
    const { scene, animate } = createSquareScene();
    currentScene = scene;
    currentAnimate = animate;
  } else if (name === "relieve") {
    const { scene, animate } = createReliefScene(renderer, camera);
    currentScene = scene;
    currentAnimate = animate;
  } else {
    const { scene, animate } = createEmptyScene();
    currentScene = scene;
    currentAnimate = animate;
  }

  currentAnimate();
}

// Menú de selección
const sceneSelect = document.getElementById("scene-select");
sceneSelect.addEventListener("change", (e) => {
  switchScene(e.target.value);
});

// Escena inicial
switchScene(sceneSelect.value);
