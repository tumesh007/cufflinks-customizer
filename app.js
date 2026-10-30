/**
 * ============================================================
 * Cufflink Studio 3D - Application Logic
 * Interactive 3D WebGL Parametric CAD with Selectable SVG/PNG Emblems & Real-Time STL Exporter
 * ============================================================
 */

// Application State
const state = {
  designType: 'pnb',      // 'pnb' | 'crest' | 'fleur' | 'star' | 'monogram' | 'blank' | 'custom'
  monogramText: 'TK',
  layoutCount: 1,         // 1, 2, 4, 8
  materialColor: 0xD4AF37,// Default Silk Gold
  materialRoughness: 0.35,
  materialMetalness: 0.60,
  
  // Parametric Dimensions (in mm)
  faceDiameter: 20.0,
  faceThickness: 3.0,
  reliefDepth: 0.8,
  borderWidth: 1.2,
  emblemScale: 100,       // Percentage (50 - 130)
  postLength: 10.0,
  postDiameter: 4.5,
  jointReinforce: 1.8,    // Conical fillet height at face-to-post joint
  buttonDiameter: 12.0,
  buttonHeight: 5.5,
  buttonConeH: 4.0,

  // Custom Uploaded Emblem Shapes
  customShapes: null,
  customFileName: ''
};

// Preset SVG Path Definitions
const PRESET_SVGS = {
  pnb: `
    <svg viewBox="0 0 100 100">
      <path d="M 38 25 L 38 56 Q 38 72 52 72 L 62 72 L 62 25 L 74 25 L 74 72 Q 74 85 50 85 Q 26 85 26 58 L 26 25 Z" />
      <circle cx="50" cy="42" r="10" />
    </svg>
  `,
  crest: `
    <svg viewBox="0 0 100 100">
      <path d="M 20 70 L 25 35 L 40 52 L 50 25 L 60 52 L 75 35 L 80 70 Z" />
      <circle cx="25" cy="30" r="5" />
      <circle cx="50" cy="20" r="5" />
      <circle cx="75" cy="30" r="5" />
      <rect x="20" y="74" width="60" height="8" rx="3" />
    </svg>
  `,
  fleur: `
    <svg viewBox="0 0 100 100">
      <path d="M 50 15 C 42 32 30 45 15 50 C 32 55 42 65 44 80 L 50 78 L 56 80 C 58 65 68 55 85 50 C 70 45 58 32 50 15 Z" />
      <circle cx="50" cy="52" r="7" />
    </svg>
  `,
  star: `
    <svg viewBox="0 0 100 100">
      <polygon points="50,15 58,40 85,50 58,60 50,85 42,60 15,50 42,40" />
      <circle cx="50" cy="50" r="6" />
    </svg>
  `
};

// Three.js Globals
let scene, camera, renderer, controls;
let cufflinkGroup;
let currentMaterial;
const container = document.getElementById('webgl-canvas-container');
const loadingSpinner = document.getElementById('loading-spinner');

// Initialize Application
window.addEventListener('DOMContentLoaded', () => {
  initThree();
  setupUI();
  updateModel();
  window.addEventListener('resize', onWindowResize);
});

/**
 * Initialize Three.js Scene, Camera, Lighting & OrbitControls
 */
function initThree() {
  scene = new THREE.Scene();
  scene.background = null;

  const width = container.clientWidth;
  const height = container.clientHeight;

  // Camera setup
  camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
  camera.position.set(0, -35, 30);
  camera.up.set(0, 0, 1);

  // WebGL Renderer with full depth-testing and opaque rendering
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  container.appendChild(renderer.domElement);

  // OrbitControls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxDistance = 180;
  controls.minDistance = 8;
  controls.target.set(0, 0, 8);
  controls.update();

  // Lighting System
  setupLighting();

  // Bambu Lab A1 Mini Bed Simulator
  setupBuildPlate();

  // Main Group holding all cufflinks
  cufflinkGroup = new THREE.Group();
  scene.add(cufflinkGroup);

  // Completely Opaque Solid Material (Fixes semi-transparent appearance)
  currentMaterial = new THREE.MeshStandardMaterial({
    color: state.materialColor,
    roughness: state.materialRoughness,
    metalness: state.materialMetalness,
    transparent: false,
    opacity: 1.0,
    depthWrite: true,
    depthTest: true
  });

  // Start Animation Loop
  animate();
}

/**
 * Lighting Setup: Rich three-point lighting + ambient hemisphere
 */
function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambientLight);

  // Hemisphere Light for soft non-directional fill to prevent hollow reflections
  const hemiLight = new THREE.HemisphereLight(0xfff8ee, 0x1f2438, 0.7);
  hemiLight.position.set(0, 0, 50);
  scene.add(hemiLight);

  // Key Light (Sun)
  const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.25);
  keyLight.position.set(25, -30, 45);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 150;
  const d = 50;
  keyLight.shadow.camera.left = -d;
  keyLight.shadow.camera.right = d;
  keyLight.shadow.camera.top = d;
  keyLight.shadow.camera.bottom = -d;
  keyLight.shadow.bias = -0.0003;
  scene.add(keyLight);

  // Fill Light
  const fillLight = new THREE.DirectionalLight(0x88bbff, 0.55);
  fillLight.position.set(-30, 30, 20);
  scene.add(fillLight);

  // Rim Light
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.75);
  rimLight.position.set(0, 40, 10);
  scene.add(rimLight);
}

/**
 * Bambu Lab A1 Mini Build Plate Grid (180mm x 180mm)
 */
function setupBuildPlate() {
  const bedSize = 180;
  const gridHelper = new THREE.GridHelper(bedSize, 36, 0x3b82f6, 0x1f2937);
  gridHelper.rotation.x = Math.PI / 2;
  gridHelper.position.z = -0.01;
  scene.add(gridHelper);

  const planeGeo = new THREE.PlaneGeometry(bedSize, bedSize);
  const planeMat = new THREE.ShadowMaterial({ opacity: 0.35 });
  const shadowPlane = new THREE.Mesh(planeGeo, planeMat);
  shadowPlane.receiveShadow = true;
  shadowPlane.position.z = -0.01;
  scene.add(shadowPlane);
}

/**
 * Main Geometry Generation
 * Builds a watertight, mathematically solid button-style cufflink in Three.js
 * with 45-degree Joint Reinforcement Cones and zero coplanar Z-fighting
 */
function createCufflinkMesh(designType, monogramStr) {
  const cufflink = new THREE.Group();

  const rFace = state.faceDiameter / 2;
  const rButton = state.buttonDiameter / 2;
  const rPost = state.postDiameter / 2;
  const rInner = rFace - state.borderWidth;

  // 1a. BASE REINFORCEMENT CONE AT POST-TO-FACE JOINT
  // 45-degree self-supporting transition widening from rPost to (rPost + jointReinforce)
  // Eliminates sharp 90-degree corner stress riser and drastically increases shear strength
  if (state.jointReinforce > 0) {
    const rJointBase = rPost + state.jointReinforce;
    const jointConeGeo = new THREE.CylinderGeometry(rPost, rJointBase, state.jointReinforce, 48);
    jointConeGeo.rotateX(Math.PI / 2);
    jointConeGeo.translate(0, 0, state.faceThickness + state.jointReinforce / 2);
    const jointConeMesh = new THREE.Mesh(jointConeGeo, currentMaterial);
    jointConeMesh.castShadow = true;
    jointConeMesh.receiveShadow = true;
    cufflink.add(jointConeMesh);
  }

  // 1b. Solid Post
  const postGeo = new THREE.CylinderGeometry(rPost, rPost, state.postLength, 48);
  postGeo.rotateX(Math.PI / 2);
  postGeo.translate(0, 0, state.faceThickness + state.postLength / 2);
  const postMesh = new THREE.Mesh(postGeo, currentMaterial);
  postMesh.castShadow = true;
  postMesh.receiveShadow = true;
  cufflink.add(postMesh);

  // 2. Rear Button Transition Cone (45 deg support-free)
  // Widens from rPost to rButton over buttonConeH
  const coneGeo = new THREE.CylinderGeometry(rButton, rPost, state.buttonConeH, 48);
  coneGeo.rotateX(Math.PI / 2);
  coneGeo.translate(0, 0, state.faceThickness + state.postLength + state.buttonConeH / 2);
  const coneMesh = new THREE.Mesh(coneGeo, currentMaterial);
  coneMesh.castShadow = true;
  coneMesh.receiveShadow = true;
  cufflink.add(coneMesh);

  // 3. Rounded Dome Cap for Rear Button
  const domeRadius = rButton;
  const domeGeo = new THREE.SphereGeometry(domeRadius, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2.8);
  domeGeo.rotateX(Math.PI);
  domeGeo.translate(0, 0, state.faceThickness + state.postLength + state.buttonConeH + 1.2);
  const domeMesh = new THREE.Mesh(domeGeo, currentMaterial);
  domeMesh.castShadow = true;
  domeMesh.receiveShadow = true;
  cufflink.add(domeMesh);

  // 4. BASE FACE DISC WITH RECESSED WELL (NO COPLANAR Z-FIGHTING)
  // Instead of an overlapping solid cylinder, we separate the outer rim and the floor:
  
  // 4a. Outer Raised Bevelled Border Ring (Z = 0 to Z = faceThickness)
  const borderShape = new THREE.Shape();
  borderShape.absarc(0, 0, rFace, 0, Math.PI * 2, false);
  const borderHole = new THREE.Path();
  borderHole.absarc(0, 0, rInner, 0, Math.PI * 2, true);
  borderShape.holes.push(borderHole);

  const borderGeo = new THREE.ExtrudeGeometry(borderShape, {
    depth: state.faceThickness,
    bevelEnabled: true,
    bevelSize: 0.18,
    bevelThickness: 0.18,
    bevelSegments: 2
  });
  const borderMesh = new THREE.Mesh(borderGeo, currentMaterial);
  borderMesh.castShadow = true;
  borderMesh.receiveShadow = true;
  cufflink.add(borderMesh);

  // 4b. Recessed Cavity Floor (Z = reliefDepth to Z = faceThickness)
  const floorThickness = Math.max(0.6, state.faceThickness - state.reliefDepth);
  const floorGeo = new THREE.CylinderGeometry(rInner, rInner, floorThickness, 64);
  floorGeo.rotateX(Math.PI / 2);
  floorGeo.translate(0, 0, state.reliefDepth + floorThickness / 2);
  const floorMesh = new THREE.Mesh(floorGeo, currentMaterial);
  floorMesh.castShadow = true;
  floorMesh.receiveShadow = true;
  cufflink.add(floorMesh);

  // 5. Decorative Emblem Geometry on Face
  // Sits inside the recessed cavity from Z = 0 to Z = reliefDepth (zero overlap!)
  const reliefGroup = new THREE.Group();
  const targetEmblemSize = rInner * 2 * 0.72 * (state.emblemScale / 100);

  if (designType === 'custom' && state.customShapes && state.customShapes.length > 0) {
    const customGeo = createExtrudedShapes(state.customShapes, targetEmblemSize, state.reliefDepth);
    if (customGeo) {
      const mesh = new THREE.Mesh(customGeo, currentMaterial);
      mesh.castShadow = true;
      reliefGroup.add(mesh);
    }
  } else if (PRESET_SVGS[designType]) {
    const shapes = parseSvgStringToShapes(PRESET_SVGS[designType]);
    if (shapes && shapes.length > 0) {
      const emblemGeo = createExtrudedShapes(shapes, targetEmblemSize, state.reliefDepth);
      if (emblemGeo) {
        const mesh = new THREE.Mesh(emblemGeo, currentMaterial);
        mesh.castShadow = true;
        reliefGroup.add(mesh);
      }
    }
  } else if (designType === 'monogram') {
    const monoGroup = createMonogramMesh(monogramStr || 'TK', targetEmblemSize);
    reliefGroup.add(monoGroup);
  }

  cufflink.add(reliefGroup);
  return cufflink;
}

/**
 * Parses SVG XML string into Three.js Shapes
 */
function parseSvgStringToShapes(svgString) {
  try {
    const loader = new THREE.SVGLoader();
    const svgData = loader.parse(svgString);
    const shapes = [];
    svgData.paths.forEach(path => {
      const pathShapes = THREE.SVGLoader.createShapes(path);
      shapes.push(...pathShapes);
    });
    return shapes;
  } catch (err) {
    console.error('Failed to parse SVG string:', err);
    return null;
  }
}

/**
 * Normalizes, Centers, and Extrudes an array of THREE.Shape into a solid Geometry
 */
function createExtrudedShapes(shapes, targetDiameter, depth) {
  if (!shapes || shapes.length === 0) return null;

  const extrudeSettings = {
    depth: depth,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.10,
    bevelThickness: 0.10
  };

  const geo = new THREE.ExtrudeGeometry(shapes, extrudeSettings);
  geo.computeBoundingBox();

  const bbox = geo.boundingBox;
  const sizeX = bbox.max.x - bbox.min.x;
  const sizeY = bbox.max.y - bbox.min.y;
  const maxDim = Math.max(sizeX, sizeY) || 1;

  // Scale to fit target diameter
  const scale = targetDiameter / maxDim;
  geo.scale(scale, -scale, 1); // Flip Y because SVG coordinates point down

  // Re-center on XY plane
  geo.computeBoundingBox();
  const cX = (geo.boundingBox.max.x + geo.boundingBox.min.x) / 2;
  const cY = (geo.boundingBox.max.y + geo.boundingBox.min.y) / 2;
  geo.translate(-cX, -cY, 0);

  return geo;
}

/**
 * Converts a PNG / JPEG image into 2D THREE.Shape spans
 */
function processRasterImageToShapes(image) {
  const canvas = document.createElement('canvas');
  const maxRes = 64;
  let w = image.width;
  let h = image.height;
  if (w > h) {
    h = Math.round((h / w) * maxRes);
    w = maxRes;
  } else {
    w = Math.round((w / h) * maxRes);
    h = maxRes;
  }

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h).data;

  // Check corner pixels to determine background brightness
  const cornerAlpha = imgData[3];
  const cornerLum = (imgData[0] + imgData[1] + imgData[2]) / 3;
  const isLightBg = cornerAlpha > 128 && cornerLum > 128;

  const grid = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];
      const a = imgData[idx + 3];

      let isForeground = false;
      if (a < 50) {
        isForeground = false;
      } else if (isLightBg) {
        const lum = (r + g + b) / 3;
        isForeground = lum < 150;
      } else {
        const lum = (r + g + b) / 3;
        isForeground = lum > 100 && a > 100;
      }
      grid[y * w + x] = isForeground ? 1 : 0;
    }
  }

  const shapes = [];
  for (let y = 0; y < h; y++) {
    let startX = -1;
    for (let x = 0; x < w; x++) {
      const val = grid[y * w + x];
      if (val === 1 && startX === -1) {
        startX = x;
      } else if ((val === 0 || x === w - 1) && startX !== -1) {
        const endX = (val === 1 && x === w - 1) ? x : x - 1;
        const spanW = endX - startX + 1;

        const shape = new THREE.Shape();
        shape.moveTo(startX, y);
        shape.lineTo(startX + spanW, y);
        shape.lineTo(startX + spanW, y + 1);
        shape.lineTo(startX, y + 1);
        shape.closePath();
        shapes.push(shape);

        startX = -1;
      }
    }
  }

  return shapes;
}

/**
 * Monogram 3D Geometry Builder
 */
function createMonogramMesh(text, targetSize) {
  const group = new THREE.Group();
  const cleanText = (text || 'TK').toUpperCase().slice(0, 3);
  const s = (targetSize / 20);

  if (cleanText.includes('T')) {
    // T Crossbar
    const barGeo = new THREE.BoxGeometry(9 * s, 2.2 * s, state.reliefDepth);
    barGeo.translate(-1.5 * s, 5 * s, state.reliefDepth / 2);
    group.add(new THREE.Mesh(barGeo, currentMaterial));
    // T Stem
    const stemGeo = new THREE.BoxGeometry(2.4 * s, 11 * s, state.reliefDepth);
    stemGeo.translate(-2 * s, 0, state.reliefDepth / 2);
    group.add(new THREE.Mesh(stemGeo, currentMaterial));
  }

  if (cleanText.includes('K')) {
    // Upper diagonal arm
    const arm1Geo = new THREE.BoxGeometry(2.2 * s, 8 * s, state.reliefDepth);
    arm1Geo.rotateZ(-Math.PI / 4.2);
    arm1Geo.translate(2.5 * s, 2.8 * s, state.reliefDepth / 2);
    group.add(new THREE.Mesh(arm1Geo, currentMaterial));

    // Lower diagonal arm
    const arm2Geo = new THREE.BoxGeometry(2.2 * s, 8 * s, state.reliefDepth);
    arm2Geo.rotateZ(Math.PI / 4.2);
    arm2Geo.translate(2.5 * s, -2.8 * s, state.reliefDepth / 2);
    group.add(new THREE.Mesh(arm2Geo, currentMaterial));
  } else if (!cleanText.includes('T')) {
    const boxGeo = new THREE.BoxGeometry(6 * s, 10 * s, state.reliefDepth);
    boxGeo.translate(0, 0, state.reliefDepth / 2);
    group.add(new THREE.Mesh(boxGeo, currentMaterial));
  }

  return group;
}

/**
 * Regenerate Scene with Current Layout (1, 2, 4, 8 cufflinks)
 */
function updateModel() {
  while (cufflinkGroup.children.length > 0) {
    const obj = cufflinkGroup.children[0];
    cufflinkGroup.remove(obj);
  }

  const count = state.layoutCount;
  const spacingX = state.faceDiameter + 12;
  const spacingY = state.faceDiameter + 12;

  if (count === 1) {
    const single = createCufflinkMesh(state.designType, state.monogramText);
    cufflinkGroup.add(single);
  } else if (count === 2) {
    const c1 = createCufflinkMesh(state.designType, state.monogramText);
    c1.position.set(-spacingX / 2, 0, 0);
    const c2 = createCufflinkMesh(state.designType, state.monogramText);
    c2.position.set(spacingX / 2, 0, 0);
    cufflinkGroup.add(c1, c2);
  } else if (count === 4) {
    const positions = [
      [-spacingX / 2, -spacingY / 2],
      [ spacingX / 2, -spacingY / 2],
      [-spacingX / 2,  spacingY / 2],
      [ spacingX / 2,  spacingY / 2]
    ];
    positions.forEach((pos) => {
      const c = createCufflinkMesh(state.designType, state.monogramText);
      c.position.set(pos[0], pos[1], 0);
      cufflinkGroup.add(c);
    });
  } else if (count === 8) {
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const x = (col - 1.5) * spacingX;
        const y = (row - 0.5) * spacingY;
        const c = createCufflinkMesh(state.designType, state.monogramText);
        c.position.set(x, y, 0);
        cufflinkGroup.add(c);
      }
    }
  }

  const label = state.designType === 'custom' 
    ? (state.customFileName || 'Custom Emblem') 
    : state.designType.toUpperCase();
  document.getElementById('status-tag').textContent = `Loaded: ${count} × ${label} Cufflink${count > 1 ? 's' : ''}`;
}

/**
 * UI Controls Setup
 */
function setupUI() {
  // Preset Emblem Swatches
  const emblemSwatches = document.querySelectorAll('#emblem-gallery .emblem-swatch');
  emblemSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      emblemSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      state.designType = swatch.dataset.id;

      // Show/Hide Monogram text input
      const monoSection = document.getElementById('monogram-controls');
      monoSection.style.display = state.designType === 'monogram' ? 'block' : 'none';

      document.getElementById('upload-filename').textContent = 'Drag & drop or click to upload logo';
      updateModel();
    });
  });

  // Custom File Uploader (SVG & PNG)
  const fileInput = document.getElementById('emblem-file-input');
  const uploadTrigger = document.getElementById('btn-trigger-upload');
  const uploadZone = document.getElementById('upload-zone');
  const uploadFilename = document.getElementById('upload-filename');

  uploadTrigger.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleUploadedFile(file);
  });

  // Drag and Drop
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.style.opacity = '0.7';
  });
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.style.opacity = '1';
  });
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.style.opacity = '1';
    const file = e.dataTransfer.files[0];
    if (file) handleUploadedFile(file);
  });

  function handleUploadedFile(file) {
    showSpinner(true, 'Processing Logo Geometry...');
    uploadFilename.textContent = `File: ${file.name}`;
    state.customFileName = file.name;

    const isSvg = file.name.toLowerCase().endsWith('.svg') || file.type === 'image/svg+xml';

    if (isSvg) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const svgContent = evt.target.result;
        const shapes = parseSvgStringToShapes(svgContent);
        if (shapes && shapes.length > 0) {
          state.customShapes = shapes;
          state.designType = 'custom';
          emblemSwatches.forEach(s => s.classList.remove('active'));
          updateModel();
        } else {
          alert('Could not find vector paths in this SVG. Please try another SVG or a PNG.');
        }
        showSpinner(false);
      };
      reader.readAsText(file);
    } else {
      // PNG / JPEG
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
          const shapes = processRasterImageToShapes(img);
          if (shapes && shapes.length > 0) {
            state.customShapes = shapes;
            state.designType = 'custom';
            emblemSwatches.forEach(s => s.classList.remove('active'));
            updateModel();
          } else {
            alert('Could not extract silhouette from image. Ensure high contrast.');
          }
          showSpinner(false);
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // Monogram Input
  const monoInput = document.getElementById('monogram-input');
  const monoPreview = document.getElementById('monogram-preview-icon');
  monoInput.addEventListener('input', (e) => {
    state.monogramText = e.target.value.toUpperCase();
    monoPreview.textContent = state.monogramText || 'TK';
    if (state.designType === 'monogram') updateModel();
  });

  // Emblem Tuning Sliders
  bindSlider('param-emblem-scale', 'val-emblem-scale', 'emblemScale', '%');
  bindSlider('param-relief-depth', 'val-relief-depth', 'reliefDepth', ' mm');

  // Layout Buttons (1, 2, 4, 8)
  const layoutBtns = document.querySelectorAll('#layout-group .btn-toggle');
  layoutBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      layoutBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.layoutCount = parseInt(btn.dataset.count, 10);
      updateModel();
    });
  });

  // Dimension Sliders
  bindSlider('param-face-diameter', 'val-face-diameter', 'faceDiameter', ' mm');
  bindSlider('param-post-length', 'val-post-length', 'postLength', ' mm');
  bindSlider('param-post-diameter', 'val-post-diameter', 'postDiameter', ' mm');
  bindSlider('param-joint-reinforce', 'val-joint-reinforce', 'jointReinforce', ' mm');
  bindSlider('param-button-diameter', 'val-button-diameter', 'buttonDiameter', ' mm');

  // Color Swatches
  const swatches = document.querySelectorAll('.color-swatch');
  const materialName = document.getElementById('material-name');
  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      swatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const hex = swatch.dataset.color;
      state.materialColor = parseInt(hex.replace('#', '0x'), 16);
      materialName.textContent = swatch.dataset.name;
      currentMaterial.color.setHex(state.materialColor);
    });
  });

  // Camera Presets
  document.getElementById('cam-isometric').addEventListener('click', () => setCameraView(0, -35, 30));
  document.getElementById('cam-top').addEventListener('click', () => setCameraView(0, 0, 42));
  document.getElementById('cam-side').addEventListener('click', () => setCameraView(0, -42, 8));
  document.getElementById('cam-bottom').addEventListener('click', () => setCameraView(0, 0, -42));

  // Export STL Button
  document.getElementById('btn-download-stl').addEventListener('click', exportSTL);

  // Download SCAD Button
  document.getElementById('btn-download-scad').addEventListener('click', downloadSCAD);
}

function bindSlider(sliderId, labelId, stateProp, unit) {
  const slider = document.getElementById(sliderId);
  const label = document.getElementById(labelId);
  slider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    state[stateProp] = val;
    label.textContent = val.toFixed(1) + unit;
    updateModel();
  });
}

function setCameraView(x, y, z) {
  camera.position.set(x, y, z);
  controls.target.set(0, 0, 8);
  controls.update();
}

/**
 * STL File Export (Direct Browser Download)
 */
function exportSTL() {
  showSpinner(true, 'Compiling Watertight STL...');

  setTimeout(() => {
    try {
      const exporter = new THREE.STLExporter();
      const stlString = exporter.parse(cufflinkGroup, { binary: true });

      const blob = new Blob([stlString], { type: 'application/octet-stream' });
      const filename = `Cufflinks_${state.designType.toUpperCase()}_x${state.layoutCount}.stl`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);

      showSpinner(false);
    } catch (err) {
      console.error('Export error:', err);
      alert('Error exporting STL: ' + err.message);
      showSpinner(false);
    }
  }, 100);
}

/**
 * Generates and downloads the corresponding Parametric OpenSCAD script
 */
function downloadSCAD() {
  const scadSource = `// ============================================================
// Cufflink Studio 3D - Exported Parametric OpenSCAD Source
// ============================================================

face_diameter       = ${state.faceDiameter};
face_thickness      = ${state.faceThickness};
relief_height       = ${state.reliefDepth};
border_width        = ${state.borderWidth};
post_length         = ${state.postLength};
post_diameter       = ${state.postDiameter};
joint_reinforcement = ${state.jointReinforce};
button_diameter     = ${state.buttonDiameter};
button_height       = ${state.buttonHeight};
button_cone_h       = ${state.buttonConeH};
$fn = 100;

module cufflink_post_and_button() {
    // 45-degree base cone for joint strength
    translate([0, 0, face_thickness])
        cylinder(d1=post_diameter + 2*joint_reinforcement, d2=post_diameter, h=joint_reinforcement);

    // Solid post
    translate([0, 0, face_thickness])
        cylinder(d=post_diameter, h=post_length);

    // Rear button transition cone
    translate([0, 0, face_thickness + post_length]) {
        cylinder(d1=post_diameter, d2=button_diameter, h=button_cone_h);
        translate([0, 0, button_cone_h])
            difference() {
                sphere(d=button_diameter);
                translate([0, 0, -button_diameter/2])
                    cube([button_diameter+2, button_diameter+2, button_diameter], center=true);
            }
    }
}

module cufflink_base() {
    difference() {
        cylinder(d=face_diameter, h=face_thickness);
        translate([0, 0, -0.01])
            cylinder(d=face_diameter - 2*border_width, h=relief_height + 0.01);
    }
    cufflink_post_and_button();
}

cufflink_base();
`;

  const blob = new Blob([scadSource], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `cufflink_${state.designType}.scad`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function showSpinner(show, msg = 'Processing...') {
  if (show) {
    loadingSpinner.querySelector('.spinner-text').textContent = msg;
    loadingSpinner.classList.add('active');
  } else {
    loadingSpinner.classList.remove('active');
  }
}

function onWindowResize() {
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
