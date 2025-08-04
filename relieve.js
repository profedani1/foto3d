export default function startReliefApp() {
  const canvas = document.getElementById("glcanvas");
  const gl = canvas.getContext("webgl");
  if (!gl) {
    alert("WebGL no soportado");
    return;
  }

  function createShader(type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  const vertexShaderSrc = `
    attribute vec3 aPosition;
    attribute vec3 aColor;
    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;
    varying vec3 vColor;
    void main() {
      gl_Position = uPMatrix * uMVMatrix * vec4(aPosition, 1.0);
      vColor = aColor;
      gl_PointSize = 5.0;
    }
  `;
  const fragmentShaderSrc = `
    precision mediump float;
    varying vec3 vColor;
    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      gl_FragColor = vec4(vColor, 1.0);
    }
  `;

  const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSrc);
  const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSrc);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
  }
  gl.useProgram(program);

  const aPositionLoc = gl.getAttribLocation(program, "aPosition");
  const aColorLoc = gl.getAttribLocation(program, "aColor");
  const uMVMatrixLoc = gl.getUniformLocation(program, "uMVMatrix");
  const uPMatrixLoc = gl.getUniformLocation(program, "uPMatrix");

  function perspectiveMatrix(fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]);
  }
  function normalize(v) {
    const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    return [v[0] / len, v[1] / len, v[2] / len];
  }
  function cross(a, b) {
    return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  }
  function subtract(a, b) {
    return [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
  }
  function dot(a, b) {
    return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
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

  let camPos = [0, 0, 70], camYaw = 0, camPitch = 0;
  let camPosTarget = [...camPos];
  const camPitchLimit = Math.PI / 2 - 0.01;
  const moveSpeed = 0.5, camMouseSensitivity = 0.003;
  const keys = {};
  let mousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let isDragging = false, lastMouse = { x: 0, y: 0 };

  window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
  window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);
  canvas.addEventListener("mousedown", e => {
    isDragging = true;
    lastMouse.x = e.clientX;
    lastMouse.y = e.clientY;
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("mouseup", () => {
    isDragging = false;
    canvas.style.cursor = "grab";
  });
  canvas.addEventListener("mousemove", e => {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
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
    const fx = Math.cos(camPitch) * Math.sin(camYaw);
    const fy = Math.sin(camPitch);
    const fz = Math.cos(camPitch) * Math.cos(camYaw);
    camPosTarget[0] += fx * zoomAmount;
    camPosTarget[1] += fy * zoomAmount;
    camPosTarget[2] += fz * zoomAmount;
  }, { passive: false });

  const edgeSize = 150, autoLookSpeed = 0.02;
  function autoRotateByMouse() {
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

  function createViewMatrix(pos, yaw, pitch) {
    const cx = Math.cos(pitch) * Math.sin(yaw);
    const cy = Math.sin(pitch);
    const cz = Math.cos(pitch) * Math.cos(yaw);
    return lookAt(pos, [pos[0]+cx, pos[1]+cy, pos[2]+cz], [0,1,0]);
  }

  let posBuffer = null, colBuffer = null, pointsCount = 0;
  function updateBuffers(positions, colors) {
    pointsCount = positions.length / 3;
    if (!posBuffer) posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    if (!colBuffer) colBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aPositionLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.vertexAttribPointer(aPositionLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aColorLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuffer);
    gl.vertexAttribPointer(aColorLoc, 3, gl.FLOAT, false, 0, 0);
  }

  document.getElementById("fileInput").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const w = img.width, h = img.height;
      const ctx = Object.assign(document.createElement("canvas"), {width:w,height:h}).getContext("2d");
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, w, h).data;
      const positions = [], colors = [], voxelSize = 0.2;
      const startX = -w * voxelSize / 2, startY = -h * voxelSize / 2;
      const scale = parseFloat(document.getElementById("heightScale").value);
      for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i]/255, g = data[i+1]/255, b = data[i+2]/255, a = data[i+3]/255;
        if (a < 0.1) continue;
        const brightness = 0.299*r + 0.587*g + 0.114*b;
        const px = startX + x * voxelSize;
        const py = startY + y * voxelSize;
        const z = brightness * scale;
        positions.push(px, py, z);
        colors.push(r, g, b);
      }
      updateBuffers(positions, colors);
      URL.revokeObjectURL(img.src);
    };
  });

  function render() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    moveCamera();
    autoRotateByMouse();
    const mvMatrix = createViewMatrix(camPos, camYaw, camPitch);
    gl.uniformMatrix4fv(uMVMatrixLoc, false, mvMatrix);
    const pMatrix = perspectiveMatrix((45*Math.PI)/180, canvas.width/canvas.height, 0.1, 1000);
    gl.uniformMatrix4fv(uPMatrixLoc, false, pMatrix);
    gl.drawArrays(gl.POINTS, 0, pointsCount);
    requestAnimationFrame(render);
  }

  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  });
  window.dispatchEvent(new Event("resize"));
  gl.enable(gl.VERTEX_PROGRAM_POINT_SIZE);
  render();
}
