/**
 * ============================================================
 * Cufflink Studio 3D - Application Logic
 * Interactive 3D WebGL Parametric CAD & Real-Time STL Exporter
 * ============================================================
 */

// Application State
const state = {
  designType: 'pnb',      // 'pnb' | 'monogram' | 'blank'
  monogramText: 'TK',
  layoutCount: 1,         // 1, 2, 4, 8
  materialColor: 0xD4AF37,// Default Silk Gold
  materialRoughness: 0.28,
  materialMetalness: 0.85,
  
  // Parametric Dimensions (in mm)
  faceDiameter: 20.0,
  faceThickness: 3.0,
  reliefDepth: 0.8,
  borderWidth: 1.2,
  postLength: 10.0,
  postDiameter: 4.5,
  buttonDiameter: 12.0,
  buttonHeight: 5.5,
  buttonConeH: 4.0
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
  scene.background = null; // Radial gradient from CSS

  const width = container.clientWidth;
  const height = container.clientHeight;

  // Camera setup
  camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
  camera.position.set(0, -35, 30);
  camera.up.set(0, 0, 1); // Z is UP (standard 3D printing coordinate system)

  // WebGL Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
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

  // Default Material
  currentMaterial = new THREE.MeshStandardMaterial({
    color: state.materialColor,
    roughness: state.materialRoughness,
    metalness: state.materialMetalness,
    envMapIntensity: 1.2
  });

  // Start Animation Loop
  animate();
}

/**
 * Lighting Setup
 */
function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambientLight);

  // Key Light (Sun)
  const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.2);
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
  const fillLight = new THREE.DirectionalLight(0x88bbff, 0.5);
  fillLight.position.set(-30, 30, 20);
  scene.add(fillLight);

  // Rim / Studio Backlight
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.7);
  rimLight.position.set(0, 40, 10);
  scene.add(rimLight);
}

/**
 * Bambu Lab A1 Mini Build Plate Grid (180mm x 180mm)
 */
function setupBuildPlate() {
  const bedSize = 180;
  const gridHelper = new THREE.GridHelper(bedSize, 36, 0x3b82f6, 0x1f2937);
  gridHelper.rotation.x = Math.PI / 2; // Flat on XY plane
  gridHelper.position.z = -0.01;
  scene.add(gridHelper);

  // Shadow Receiver Plane
  const planeGeo = new THREE.PlaneGeometry(bedSize, bedSize);
  const planeMat = new THREE.ShadowMaterial({ opacity: 0.35 });
  const shadowPlane = new THREE.Mesh(planeGeo, planeMat);
  shadowPlane.receiveShadow = true;
  shadowPlane.position.z = -0.01;
  scene.add(shadowPlane);
}

/**
 * Main Geometry Generation
 * Builds a watertight, mathematically precise button-style cufflink in Three.js
 */
function createCufflinkMesh(designType, monogramStr) {
  const cufflink = new THREE.Group();

  const rFace = state.faceDiameter / 2;
  const rButton = state.buttonDiameter / 2;
  const rPost = state.postDiameter / 2;
  const rInner = rFace - state.borderWidth;

  // 1. Solid Post
  // Z goes from faceThickness to (faceThickness + postLength)
  const postGeo = new THREE.CylinderGeometry(rPost, rPost, state.postLength, 48);
  postGeo.rotateX(Math.PI / 2); // Align with Z-axis
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

  // 4. Base Face Disc (Front at Z=0, Rear at Z=faceThickness)
  // Bevelled outer edge + recessed background field
  const faceBodyGeo = new THREE.CylinderGeometry(rFace, rFace, state.faceThickness, 64);
  faceBodyGeo.rotateX(Math.PI / 2);
  faceBodyGeo.translate(0, 0, state.faceThickness / 2);
  const faceMesh = new THREE.Mesh(faceBodyGeo, currentMaterial);
  faceMesh.castShadow = true;
  faceMesh.receiveShadow = true;
  cufflink.add(faceMesh);

  // 5. Decorative Emblem / Monogram Geometry on Face (Z = 0)
  // Extruded geometry rendered face-down (Z = 0 to Z = reliefDepth)
  const reliefGroup = new THREE.Group();

  if (designType === 'pnb') {
    // Official 2022 PNB 'प' (Pa) Container + Coin Emblem
    const pnbShape = createPNBShape(rInner * 0.72);
    const extrudeSettings = { depth: state.reliefDepth + 0.1, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.12, bevelThickness: 0.12 };
    const pnbGeo = new THREE.ExtrudeGeometry(pnbShape, extrudeSettings);
    // Center it on the face at Z = 0
    pnbGeo.center();
    pnbGeo.translate(0, 0, (state.reliefDepth + 0.1) / 2);
    const emblemMesh = new THREE.Mesh(pnbGeo, currentMaterial);
    emblemMesh.castShadow = true;
    reliefGroup.add(emblemMesh);

    // Coin inside safe
    const coinGeo = new THREE.CylinderGeometry(rInner * 0.18, rInner * 0.18, state.reliefDepth + 0.15, 32);
    coinGeo.rotateX(Math.PI / 2);
    coinGeo.translate(0, rInner * 0.18, (state.reliefDepth + 0.15) / 2);
    const coinMesh = new THREE.Mesh(coinGeo, currentMaterial);
    reliefGroup.add(coinMesh);

  } else if (designType === 'monogram') {
    // Interlocking Monogram Shapes
    const monoGroup = createMonogramMesh(monogramStr || 'TK', rInner * 0.75);
    reliefGroup.add(monoGroup);
  }

  // Raised decorative outer border ring
  const ringShape = new THREE.Shape();
  ringShape.absarc(0, 0, rFace, 0, Math.PI * 2, false);
  const holePath = new THREE.Path();
  holePath.absarc(0, 0, rInner, 0, Math.PI * 2, true);
  ringShape.holes.push(holePath);

  const ringGeo = new THREE.ExtrudeGeometry(ringShape, { depth: state.reliefDepth + 0.05, bevelEnabled: true, bevelSize: 0.15, bevelThickness: 0.15 });
  ringGeo.translate(0, 0, 0);
  const ringMesh = new THREE.Mesh(ringGeo, currentMaterial);
  reliefGroup.add(ringMesh);

  cufflink.add(reliefGroup);

  return cufflink;
}

/**
 * Generates the Official PNB 'प' (Pa) safe-container curve
 */
function createPNBShape(size) {
  const shape = new THREE.Shape();
  const s = size / 14;

  // Draw the 'प' outline: open safe container
  shape.moveTo(-5 * s, 6 * s);
  shape.lineTo(-2 * s, 6 * s);
  shape.lineTo(-2 * s, -1 * s);
  // Curve bottom
  shape.quadraticCurveTo(-2 * s, -5 * s, 2 * s, -5 * s);
  shape.lineTo(2 * s, -5 * s);
  shape.lineTo(2 * s, 6 * s);
  shape.lineTo(5 * s, 6 * s);
  shape.lineTo(5 * s, -5 * s);
  shape.quadraticCurveTo(5 * s, -8 * s, 0, -8 * s);
  shape.quadraticCurveTo(-5 * s, -8 * s, -5 * s, -3 * s);
  shape.closePath();

  return shape;
}

/**
 * Monogram 3D Geometry Builder
 */
function createMonogramMesh(text, scale) {
  const group = new THREE.Group();
  const cleanText = (text || 'TK').toUpperCase().slice(0, 3);
  const s = scale / 12;

  if (cleanText.includes('T')) {
    // T Crossbar
    const barGeo = new THREE.BoxGeometry(9 * s, 2.2 * s, state.reliefDepth + 0.1);
    barGeo.translate(-1.5 * s, 5 * s, (state.reliefDepth + 0.1) / 2);
    group.add(new THREE.Mesh(barGeo, currentMaterial));
    // T Stem
    const stemGeo = new THREE.BoxGeometry(2.4 * s, 11 * s, state.reliefDepth + 0.1);
    stemGeo.translate(-2 * s, 0, (state.reliefDepth + 0.1) / 2);
    group.add(new THREE.Mesh(stemGeo, currentMaterial));
  }

  if (cleanText.includes('K')) {
    // Upper diagonal arm
    const arm1Geo = new THREE.BoxGeometry(2.2 * s, 8 * s, state.reliefDepth + 0.12);
    arm1Geo.rotateZ(-Math.PI / 4.2);
    arm1Geo.translate(2.5 * s, 2.8 * s, (state.reliefDepth + 0.12) / 2);
    group.add(new THREE.Mesh(arm1Geo, currentMaterial));

    // Lower diagonal arm
    const arm2Geo = new THREE.BoxGeometry(2.2 * s, 8 * s, state.reliefDepth + 0.12);
    arm2Geo.rotateZ(Math.PI / 4.2);
    arm2Geo.translate(2.5 * s, -2.8 * s, (state.reliefDepth + 0.12) / 2);
    group.add(new THREE.Mesh(arm2Geo, currentMaterial));
  } else if (!cleanText.includes('T')) {
    // Fallback for custom single/double letters: Clean stylized blocks
    const boxGeo = new THREE.BoxGeometry(6 * s, 10 * s, state.reliefDepth + 0.1);
    boxGeo.translate(0, 0, (state.reliefDepth + 0.1) / 2);
    group.add(new THREE.Mesh(boxGeo, currentMaterial));
  }

  return group;
}

/**
 * Regenerate Scene with Current Layout (1, 2, 4, 8 cufflinks)
 */
function updateModel() {
  // Clear existing cufflinks
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
    // 1 Pair
    const c1 = createCufflinkMesh(state.designType, state.monogramText);
    c1.position.set(-spacingX / 2, 0, 0);
    const c2 = createCufflinkMesh(state.designType, state.monogramText);
    c2.position.set(spacingX / 2, 0, 0);
    cufflinkGroup.add(c1, c2);
  } else if (count === 4) {
    // 4 Cufflinks (2 PNB + 2 TK or 4 of selected)
    const positions = [
      [-spacingX / 2, -spacingY / 2],
      [ spacingX / 2, -spacingY / 2],
      [-spacingX / 2,  spacingY / 2],
      [ spacingX / 2,  spacingY / 2]
    ];
    positions.forEach((pos, idx) => {
      // If PNB preset chosen, alternate with TK for pair variety
      const type = (state.designType === 'pnb' && idx >= 2) ? 'monogram' : state.designType;
      const c = createCufflinkMesh(type, state.monogramText);
      c.position.set(pos[0], pos[1], 0);
      cufflinkGroup.add(c);
    });
  } else if (count === 8) {
    // 8 Cufflinks (Full Tray)
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const x = (col - 1.5) * spacingX;
        const y = (row - 0.5) * spacingY;
        const type = (state.designType === 'pnb' && row === 1) ? 'monogram' : state.designType;
        const c = createCufflinkMesh(type, state.monogramText);
        c.position.set(x, y, 0);
        cufflinkGroup.add(c);
      }
    }
  }

  // Update Status Display
  document.getElementById('status-tag').textContent = `Loaded: ${count} × ${state.designType.toUpperCase()} Cufflink${count > 1 ? 's' : ''}`;
}

/**
 * UI Controls Setup
 */
function setupUI() {
  // Preset Selection
  const designBtns = document.querySelectorAll('#design-type-group .btn-toggle');
  designBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      designBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.designType = btn.dataset.type;

      // Show/Hide Monogram text input
      const monoSection = document.getElementById('monogram-controls');
      monoSection.style.display = state.designType === 'monogram' ? 'block' : 'none';

      updateModel();
    });
  });

  // Monogram Input
  const monoInput = document.getElementById('monogram-input');
  monoInput.addEventListener('input', (e) => {
    state.monogramText = e.target.value.toUpperCase();
    if (state.designType === 'monogram') updateModel();
  });

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
 * Uses Three.js STLExporter to create a valid, watertight ASCII/Binary STL
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
// Generated dynamically from WebApp
// ============================================================

face_diameter   = ${state.faceDiameter};
face_thickness  = ${state.faceThickness};
relief_height   = ${state.reliefDepth};
border_width    = ${state.borderWidth};
post_length     = ${state.postLength};
post_diameter   = ${state.postDiameter};
button_diameter = ${state.buttonDiameter};
button_height   = ${state.buttonHeight};
button_cone_h   = ${state.buttonConeH};
$fn = 100;

module cufflink_post_and_button() {
    translate([0, 0, face_thickness])
        cylinder(d=post_diameter, h=post_length);
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
