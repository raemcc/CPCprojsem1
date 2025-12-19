import * as THREE from 'three';
import * as TONE from 'tone';

import { OrbitControls } from "three/addons/controls/OrbitControls";
import { TTFLoader } from "three/addons/loaders/TTFLoader.js";
import { Font } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

let scene, camera, renderer, orbit;
let clock, sceneHeight, sceneWidth;
let font = null;

const raycaster = new THREE.Raycaster();
const clickMouse = new THREE.Vector2();
const moveMouse = new THREE.Vector2();
let draggable = null;

let currentColor = '#1475b5'; // default color
let currentShape = 'cube';
let currentlySelected = null;

let shapes = [];

let currentLabel = ''; // current label text
const objectLabels = new Map(); // object -> label div


// ---------- setup ----------

function init() {
  sceneWidth = window.innerWidth;
  sceneHeight = window.innerHeight;

  clock = new THREE.Clock();

  // scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfdfdf);

  // camera
  camera = new THREE.PerspectiveCamera(
    75,
    sceneWidth / sceneHeight,
    0.1,
    1000
  );
  camera.position.set(5, 5, 10);
  camera.lookAt(0, 0, 0);

  // renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(sceneWidth, sceneHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // controls
  orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableZoom = true;

  // lights
  const hemiLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 3);
  dirLight.position.set(-10, 25, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.left = -20;
  dirLight.shadow.camera.right = 20;
  dirLight.shadow.camera.top = 20;
  dirLight.shadow.camera.bottom = -20;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 200;
  scene.add(dirLight);

  createMainFloor(); 
  createSecondFloor(); 

  const loader = new TTFLoader();

  loader.load('fonts/JetBrainsMono-Medium.ttf', function (json) {
     font = new Font(json);

      addText('To Do',  { x: 0, y: -1.5, z: -8 });
      addText('Done',   { x: 20, y: -1.5, z: -8 });

  } );

  loadShapesFromStorage();

  if(shapes.length === 0){
    createShape({
    type: 'cube',
    labelText :'welcome!'
    });
  };

  updateCounter();

  window.addEventListener('resize', onWindowResize, false);
  setupInput();
  setupDragInput();
  makePaletteDraggable();

const startTone = () => {
    if (TONE.BaseContext.state !== 'running') {
      TONE.start();
    }
    // Remove listener after first use
    document.removeEventListener('click', startTone);
    document.removeEventListener('keydown', startTone);
  };
  
  document.addEventListener('click', startTone);
  document.addEventListener('keydown', startTone);

  play();
}

function makePaletteDraggable() {
  const palette = document.getElementById('UI')
  const dragHandle = document.getElementById('DragHandle');

  
  let isDragging = false;
  let startX, startY, startLeft, startTop;


  dragHandle.addEventListener('mousedown', (e) => {
    isDragging = true;

    const rect = palette.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    palette.style.position = 'fixed';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    palette.style.left = `${startLeft + deltaX}px`;
    palette.style.top = `${startTop + deltaY}px`;
    palette.style.transform = 'none';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

function createMainFloor() {
  const floorGeo = new THREE.PlaneGeometry(20, 20);
  const floorMat = new THREE.MeshPhongMaterial({
    color: 0xf9c834,
    side: THREE.DoubleSide
  });

  const mainFloor = new THREE.Mesh(floorGeo, floorMat);
  mainFloor.rotation.x = -Math.PI / 2;
  mainFloor.position.y = -1.5;
  mainFloor.receiveShadow = true;
  mainFloor.castShadow = false;
  mainFloor.userData.ground = true;

  scene.add(mainFloor);
}

function createSecondFloor() {
  const floorGeo = new THREE.PlaneGeometry(20, 20);
  const floorMat = new THREE.MeshPhongMaterial({
    color: 0x00bccc,
    side: THREE.DoubleSide
  });

    const secondFloor = new THREE.Mesh(floorGeo, floorMat);
  secondFloor.rotation.x = -Math.PI / 2;
  secondFloor.position.y = -1.5;
  secondFloor.position.x = 20;
  secondFloor.receiveShadow = true;
  secondFloor.castShadow = false;
  secondFloor.userData.ground = true;

  scene.add(secondFloor);
}




function addText(message, position = {x: 0, y: 0, z: 0}) {
  if (!font) {
    console.warn('Font not loaded yet');
    return;
  }
    let textGeo, textMesh;

    textGeo = new TextGeometry(message, {
      font: font,

      size: 2,
      depth: 1,
      with: 1,
      height: 0.25,
      curveSegments: 6,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.01,
      bevelSegments: 3

    } );

    textGeo.computeBoundingBox();
		textGeo.computeVertexNormals();

				
    const centerOffset = - 0.5 * ( textGeo.boundingBox.max.x - textGeo.boundingBox.min.x );

    const material = new THREE.MeshPhongMaterial({
      color: 0xde3c81,
      flatShading: true
    });

    textMesh = new THREE.Mesh(textGeo, material);

    textMesh.position.set(
      position.x = position.x + centerOffset,
      position.y + 0.02,
      position.z
    );

    textMesh.rotation.x = 0;
    textMesh.rotation.y = Math.PI * 2;
    textMesh.castShadow = true;
    textMesh.receiveShadow = false;
    textMesh.userData.draggable = false;

    scene.add(textMesh);

}

function createShape({
  type = 'cube',
  position = { x: 0, y: 0, z: 0 },
  color = '#1475b5',
  labelText = ''
} = {}) {
  
  let geometry;

  if (type === 'sphere') {
    geometry = new THREE.SphereGeometry(0.5, 32, 32);
  } else if (type === 'cube') {
    geometry = new THREE.BoxGeometry(1, 1, 1);
  } else if (type === 'cylinder') {
    geometry = new THREE.CylinderGeometry(1, 1, 1, 32);
  } else {
    throw new Error(`unknown shape type: ${type}`);
  }

  const material = new THREE.MeshPhongMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);

  mesh.position.set(position.x, -0.999, position.z);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  mesh.userData.draggable = true;
  mesh.userData.status = 'todo';
  mesh.userData.name = type;
console.log('New shape created with status:', mesh.userData.status); 
  scene.add(mesh);
  shapes.push(mesh);
  updateCounter();

  if (labelText) {
    attachLabelToObject(mesh, labelText);
  }

  return mesh;
}

function clearAllShapes() {
    shapes.forEach(shape => {
      scene.remove(shape);
      const label = objectLabels.get(shape);
      if (label) {
        document.body.removeChild(label);
        objectLabels.delete(shape);
      }
    });
    shapes.length = 0;  // clear array
    currentlySelected = null;
    draggable = null;
    
    // Clear storage
    localStorage.removeItem(SHAPES_KEY);
     updateCounter();

}

function clearDone(){
  const doneShapes = shapes.filter(s => s.userData.status === 'done');
  
  doneShapes.forEach(shape => {
    scene.remove(shape);
    const label = objectLabels.get(shape);
    if (label) {
      document.body.removeChild(label);
      objectLabels.delete(shape);
    }
  });
  
  // Filter out removed shapes
  shapes = shapes.filter(s => s.userData.status !== 'done');
  
  updateCounter();
  saveShapesToStorage();
}

function clearTodo() {
  const todoShapes = shapes.filter(s => s.userData.status === 'todo');
  
  todoShapes.forEach(shape => {
    scene.remove(shape);
    const label = objectLabels.get(shape);
    if (label) {
      document.body.removeChild(label);
      objectLabels.delete(shape);
    }
  });
  
  // Filter out removed shapes
  shapes = shapes.filter(s => s.userData.status !== 'todo');
  
  updateCounter();
  saveShapesToStorage();
}

const doneSynth = new TONE.Synth({
oscillator: { 
    type: 'triangle'  // ← softer than sine
  },
  envelope: { 
    attack: 0.05,     // ← slower attack = gentle
    decay: 0.3,       // ← longer decay  
    sustain: 0.4,
    release: 1.0      // ← smooth fade-out
  }
}).toDestination();
// Add subtle reverb for "spacey warmth"
const reverb = new TONE.Reverb(2).toDestination();
doneSynth.connect(reverb);


// --- labelling

const vector = new THREE.Vector3();

function attachLabelToObject(obj3d, text) {
  const template = document.getElementById('labelTemplate');
  if (!template || !template.firstElementChild) {
    return;
    }

  const labelDiv = template.firstElementChild.cloneNode(true);
  labelDiv.textContent = text;
  labelDiv.className = 'label';
  document.body.appendChild(labelDiv);

  objectLabels.set(obj3d, labelDiv);
}

function updateLabels() {

  for (const [obj3d, labelDiv] of objectLabels) {
    // World → NDC
    obj3d.getWorldPosition(vector);
    vector.project(camera);

    // NDC → screen
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

    // Get label size
    const rect = labelDiv.getBoundingClientRect();
    const labelWidth = rect.width;
    const labelHeight = rect.height;

    // Center label on object
    labelDiv.style.left = `${x - labelWidth / 2}px`;
    labelDiv.style.top  = `${y - labelHeight / 2}px`;
  }
}


// --- shape stacking

const SHAPE_SIZE = 1;
const GROUND_Y = -0.999;
const SAME_LEVEL_EPS = SHAPE_SIZE * 0.5;

function shapesOverlapXZ(a, b) {
  return (
    Math.abs(a.position.x - b.position.x) < SHAPE_SIZE &&
    Math.abs(a.position.z - b.position.z) < SHAPE_SIZE
  );
}

function getSupportY(shape) {
  let supportY = GROUND_Y;

  for (const other of shapes) {
    if (other === shape) continue;

    const belowOrNear = other.position.y <= shape.position.y + SAME_LEVEL_EPS;
    if (!belowOrNear) continue;
    if (!shapesOverlapXZ(shape, other)) continue;

    const top = other.position.y + SHAPE_SIZE;
    if (top > supportY) supportY = top;
  }

  return supportY;
}

// ---- object dragging

function setupDragInput() {
  
  const ui = document.getElementById('UI');
  const canvas = renderer.domElement;

  canvas.addEventListener('click', event => {
    if (ui && ui.contains(event.target)) {
      return;
    }

    if (draggable) {
      const previousStatus = draggable.userData.status;
      updateShapeStatus(draggable);
      updateCounter();
      if (draggable.userData.status === 'done' && previousStatus !== 'done'){
        doneSynth.triggerAttackRelease('C5', '0.3');
      }


      currentlySelected = null;
      draggable = null;
      saveShapesToStorage();
      return;
    }

    clickMouse.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    draggable = dragManager.pick(clickMouse);
    if (draggable){
      currentlySelected = draggable;
    }
  });

  window.addEventListener('mousemove', event => {
    moveMouse.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
  });
}

const dragManager = {
  draggables: () => scene.children.filter(o => o.userData?.draggable),
  groundObjects: () => scene.children.filter(o => o.userData?.ground),

  pick(mouse) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(this.draggables(), false);
    return intersects.length > 0 ? intersects[0].object : null;
  },

  getGroundPoint(mouse) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(this.groundObjects(), false);
    return intersects.length > 0 ? intersects[0].point : null;
  },

  update() {
    if (!draggable) return;

    const groundPoint = this.getGroundPoint(moveMouse);
    if (!groundPoint) return;

    draggable.position.x = groundPoint.x;
    draggable.position.z = groundPoint.z;
    draggable.position.y = getSupportY(draggable);

    updateCounter();
  }
};


//---- shape status and saving

function shapeToDescriptor(mesh) {
  return {
    type: mesh.userData.name || 'cube',
    x: mesh.position.x,
    y: mesh.position.y,
    z: mesh.position.z,
    color: mesh.material?.color?.getStyle ? mesh.material.color.getStyle() : '#1475b5',
    label: objectLabels.get(mesh)?.textContent || '',
    status: mesh.userData.status || 'todo'  // ← ADD THIS LINE!

  };
}

function createShapeFromDescriptor(desc) {
  const shape = createShape({
    type: desc.type,
    position: { x: desc.x, y: desc.y, z: desc.z },
    color: desc.color,
    labelText: desc.label
  });
    shape.userData.status = desc.status || 'todo';
  
  return shape;
}

const SHAPES_KEY = 'myShapes_v1';

function saveShapesToStorage() {
  try {
    const descriptors = shapes.map(shapeToDescriptor);
    localStorage.setItem(SHAPES_KEY, JSON.stringify(descriptors));
  } catch (err) {
    console.warn('Failed to save shapes', err);
  }
}

function loadShapesFromStorage() {
  try {
    const raw = localStorage.getItem(SHAPES_KEY);
    if (!raw) return;
    const descriptors = JSON.parse(raw);
    descriptors.forEach(desc => createShapeFromDescriptor(desc));
    updateCounter();

  } catch (err) {
    console.warn('Failed to load shapes', err);
  }
}

function updateShapeStatus(shape) {
  if (shape.position.x >= -10 && shape.position.x <= 10) {
    shape.userData.status = 'todo';  // Floor 1 (gold)
  } else if (shape.position.x >= 10 && shape.position.x <= 30) {
    shape.userData.status = 'done';  // Floor 2 (blue)
  }
}

function updateCounter() {
  const todoCount = shapes.filter(s => {
    console.log('Shape status:', s.userData.status);  // Debug: see ALL statuses
    return s.userData.status === 'todo';
  }).length;
  
    const doneCount = shapes.filter(s => {
    console.log('Shape status (done check):', s.userData.status);
    return s.userData.status === 'done';
  }).length;
  
  console.log(`ToDo count: ${todoCount}, Done count: ${doneCount}`);  // Debug: final counts
  
  document.getElementById('counter').textContent = `ToDo: ${todoCount} | Done: ${doneCount}`;
}

// ---------- input ----------

function setupInput() {
  const labelInput = document.getElementById('labelInput');
  
  // UI handlers only
  labelInput.addEventListener('input', e => currentLabel = e.target.value);
  setupColorSwatches();
  setupShapeSwatches();
  setupSpawnButton(labelInput);
  setupClearButton();
  setupClearDoneButton();
  setupClearTodoButton();
  setupHamburgerToggle(); 
}

function setupColorSwatches() {
  const swatches = document.querySelectorAll('.swatch');
  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      swatches.forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      currentColor = swatch.dataset.color;
    });
  });
  if (swatches.length > 0) swatches[0].click();
}

function setupShapeSwatches() {
  const swatches = document.querySelectorAll('.shape-swatch');
  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      swatches.forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      currentShape = swatch.dataset.shape;
    });
  });
}

function setupSpawnButton(labelInput) {
  const spawnBtn = document.getElementById('spawnBtn');
  spawnBtn.addEventListener('click', () => {
    const x = (Math.random() - 0.5) * 10;
    const z = (Math.random() - 0.5) * 10;

    createShape({
      type: currentShape,
      position: { x, y: 0, z },
      color: currentColor,
      labelText: currentLabel
    });
    saveShapesToStorage();
    labelInput.value = '';
    currentLabel = '';
  });
}

function setupClearButton() {
  const clearBtn = document.getElementById('clearAllBtn');
  clearBtn.addEventListener('click', () => {
    clearAllShapes();
  });
}

function setupClearDoneButton() {
  const clearDoneBtn = document.getElementById('clearDoneBtn');
  clearDoneBtn.addEventListener('click', clearDone);
}

function setupClearTodoButton() {
  const clearTodoBtn = document.getElementById('clearTodoBtn');
  clearTodoBtn.addEventListener('click', clearTodo);
}

function setupHamburgerToggle() {
  const menuIcon = document.querySelector('.MenuIcon');
  const hidden = document.getElementById('hiddenItems');
  const ui = document.getElementById('UI');
  const handle = document.getElementById('DragHandle');

if (!menuIcon || !hidden || !ui) return;

  menuIcon.style.cursor = 'pointer';

  hidden.classList.add('hiddenItems-collapsed');
  ui.classList.add('UI-collapsed');
  handle.classList.add('DragHandle-collapsed');

  menuIcon.addEventListener('click', () => {
    hidden.classList.toggle('hiddenItems-collapsed');
    ui.classList.toggle('UI-collapsed');
    handle.classList.toggle('DragHandle-collapsed');

  });
}

// ---------- loop & resize ----------


function update() {
  orbit.update();
  updateLabels(); 
}

function render() {
  dragManager.update();  // ← single call handles ALL dragging
  renderer.render(scene, camera);
}

function play() {
  renderer.setAnimationLoop(() => {
    update();
    render();
  });
}

function onWindowResize() {
  sceneHeight = window.innerHeight;
  sceneWidth = window.innerWidth;
  renderer.setSize(sceneWidth, sceneHeight);
  camera.aspect = sceneWidth / sceneHeight;
  camera.updateProjectionMatrix();
}

// ---------- start ----------

init();