import { setupControls, moveCamera, moveCameraByMouseEdges, createViewMatrix } from './controls.js';


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

  setupControls(canvas);

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
  moveCameraByMouseEdges();

  gl.useProgram(program); // ✅ NECESARIO antes de usar uniforms

  const camMat = createViewMatrix();
  gl.uniformMatrix4fv(uMVMatrixLoc, false, camMat);

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
render();} 








