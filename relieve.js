// relieve.js (ES module)
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import { setupControls, moveCamera, updateCamera, autoRotateViewByMousePosition } from './controls.js';

let animationId = null;

export function createReliefScene(renderer, camera) {
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));

  const pointsGroup = new THREE.Group();
  scene.add(pointsGroup);

  const boxSize = 20;
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(boxSize, boxSize, boxSize),
    new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
  );
  scene.add(box);

  setupControls({ scene, camera, renderer });

  const fileInput = document.getElementById("fileInput");
  const heightScaleInput = document.getElementById("heightScale");

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    img.onload = () => {
      const w = img.width;
      const h = img.height;

      const canvas2d = document.createElement("canvas");
      canvas2d.width = w;
      canvas2d.height = h;
      const ctx = canvas2d.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, w, h).data;

      pointsGroup.clear();

      const voxelSize = 0.2;
      const startX = -w * voxelSize / 2;
      const startY = -h * voxelSize / 2;

      const heightScale = parseFloat(heightScaleInput.value);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = imgData[idx] / 255;
          const g = imgData[idx + 1] / 255;
          const b = imgData[idx + 2] / 255;
          const a = imgData[idx + 3] / 255;

          if (a < 0.1) continue;

          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          const z = brightness * heightScale;

          const geometry = new THREE.SphereGeometry(0.03, 6, 6);
          const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
          const point = new THREE.Mesh(geometry, material);
          point.position.set(startX + x * voxelSize, startY + y * voxelSize, z);
          pointsGroup.add(point);
        }
      }

      URL.revokeObjectURL(url);
    };
  });

  function animate() {
    animationId = requestAnimationFrame(animate);
    moveCamera();
    autoRotateViewByMousePosition();
    updateCamera({ camera });
    renderer.render(scene, camera);
  }

  animate();

  return { scene, animate };
}
