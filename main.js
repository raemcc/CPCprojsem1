
// Import core Three.js library
import * as THREE from 'three';

// Import Tone.js for sound
import * as TONE from 'tone';

// Import camera orbit controls & loaders and geometry for 3D text
import { OrbitControls } from "three/addons/controls/OrbitControls";
import { TTFLoader } from "three/addons/loaders/TTFLoader.js";
import { Font } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

// global variables
let scene, camera, renderer, orbit;
let sceneHeight, sceneWidth;
let font = null;

// Raycasting utilities for object picking
const raycaster = new THREE.Raycaster();
const clickMouse = new THREE.Vector2();
const moveMouse = new THREE.Vector2();

let draggable = null;

let currentColor = '#1475b5'; // default color
let currentShape = 'cube'; //default shape
let currentlySelected = null;

// Array storing all draggable shapes in the scene
let shapes = [];


// Current label text from UI input
let currentLabel = ''; // current label text

// link 3D objects to their label elements
const objectLabels = new Map(); // object -> label div


// ---------- setup ----------

//initial scene set up
function init() {
  // Store viewport size
  sceneWidth = window.innerWidth;
  sceneHeight = window.innerHeight;

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

  // orbit camera controls
  orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableZoom = true;

  // lights
  // ambient lightt
  const hemiLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(hemiLight);
  // driectional light
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


  // Create both floor planes for TODO and DONE
  createMainFloor(); 
  createSecondFloor(); 

   // Load font for 3D text
  const loader = new TTFLoader();

  loader.load('fonts/JetBrainsMono-Medium.ttf', function (json) {
     font = new Font(json);
      // Add section labels once font is loaded
      addText('To Do',  { x: 0, y: -1.5, z: -8 });
      addText('Done',   { x: 20, y: -1.5, z: -8 });

  } );
  // Load saved shapes from localStorage - shapes saved on page reload
  loadShapesFromStorage();
  // Create default shape if none exist
  if(shapes.length === 0){
    createShape({
    type: 'cube',
    labelText :'welcome!'
    });
  };
  // Update counter
  updateCounter();

  window.addEventListener('resize', onWindowResize, false);
  //set up functions
  setupInput();
  setupDragInput();
  makePaletteDraggable();
  // start Tone.js after user interaction
  
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

  // Start render loop
  play();
}

// Enables dragging of the UI palette
function makePaletteDraggable() {
  const palette = document.getElementById('UI')
  const dragHandle = document.getElementById('DragHandle');

  
  let isDragging = false;
  let startX, startY, startLeft, startTop;

  //begin  dragging UI palette
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

  // Update palette position while dragging
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    palette.style.left = `${startLeft + deltaX}px`;
    palette.style.top = `${startTop + deltaY}px`;
    palette.style.transform = 'none';
  });

  // end drag
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

// Creates the "To Do" floor
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

// Creates the "Done" floor
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

// Adds 3D text to the scene
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

		// Center text horizontally		
    const centerOffset = - 0.5 * ( textGeo.boundingBox.max.x - textGeo.boundingBox.min.x );

    const material = new THREE.MeshPhongMaterial({
      color: 0xde3c81,
      flatShading: true
    });

    //create mesh for text
    textMesh = new THREE.Mesh(textGeo, material);

    // Apply position and offset

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

  // Create geometry based on the requested shape type
  if (type === 'sphere') {
    geometry = new THREE.SphereGeometry(0.5, 32, 32);
  } else if (type === 'cube') {
    geometry = new THREE.BoxGeometry(1, 1, 1);
  } else if (type === 'cylinder') {
    geometry = new THREE.CylinderGeometry(1, 1, 1, 32);
  } else {
    throw new Error(`unknown shape type: ${type}`);
  }

  // Material with lighting response (reacts to scene lights)
  const material = new THREE.MeshPhongMaterial({ color });

  // Combine geometry and material into a renderable mesh
  const mesh = new THREE.Mesh(geometry, material);

  // Apply position and offset
  mesh.position.set(position.x, -0.999, position.z);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  mesh.userData.draggable = true;
  mesh.userData.status = 'todo';
  mesh.userData.name = type;

  // add mesh to scene and to shapes array
  scene.add(mesh);
  shapes.push(mesh);
  
  // Update UI counter with newly added shape 
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

    shapes.length = 0;  // clear shapes array
    draggable = null;
    currentlySelected = null;
    
    // clear all shapes from storage
    localStorage.removeItem(SHAPES_KEY);
     updateCounter();

}

function clearDone(){
  //filter shapes to find those with DONE status
  const doneShapes = shapes.filter(s => s.userData.status === 'done');
  
  doneShapes.forEach(shape => {
    scene.remove(shape);
    const label = objectLabels.get(shape);
    if (label) {
      document.body.removeChild(label);
      objectLabels.delete(shape);
    }
  });
  
  // Filter out removed shapes from shapes array
  shapes = shapes.filter(s => s.userData.status !== 'done');
  
  updateCounter();

  //save new shapes array to storage
  saveShapesToStorage();
}

function clearTodo() {
   //filter shapes to find those with TODO status
  const todoShapes = shapes.filter(s => s.userData.status === 'todo');
  
  todoShapes.forEach(shape => {
    scene.remove(shape);
    const label = objectLabels.get(shape);
    if (label) {
      document.body.removeChild(label);
      objectLabels.delete(shape);
    }
  });
  
  // Filter out removed shapes from shapes array
  shapes = shapes.filter(s => s.userData.status !== 'todo');
  
  updateCounter();

  //save new shapes array to storage
  saveShapesToStorage();
}

// create synth sound to be played when shape is marked as done
const doneSynth = new TONE.Synth({
oscillator: { 
    type: 'triangle'  
  },
  envelope: { 
    attack: 0.05,    
    decay: 0.3,       
    sustain: 0.4,
    release: 1.0      
  }
}).toDestination();

const reverb = new TONE.Reverb(2).toDestination();
doneSynth.connect(reverb);


// --- labelling ----

const vector = new THREE.Vector3();

// Attaches a DOM label to a 3D object
function attachLabelToObject(obj3d, text) {
  // Get the template element, exit if it or its first child doesnt exist
  const template = document.getElementById('labelTemplate');
  if (!template || !template.firstElementChild) {
    return;
    }
  
  //clone templates first child to create new label
  const labelDiv = template.firstElementChild.cloneNode(true);
  //set label text, apply css and add to doc body
  labelDiv.textContent = text;
  labelDiv.className = 'label';
  document.body.appendChild(labelDiv);

  // Map the 3D object to the DOM label for tracking and updates
  objectLabels.set(obj3d, labelDiv);
}

function updateLabels() {
  // for all tracked objects with labels
  for (const [obj3d, labelDiv] of objectLabels) {
    obj3d.getWorldPosition(vector);
    vector.project(camera);

    // convert coords to screen position
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

    // get label size
    const rect = labelDiv.getBoundingClientRect();
    const labelWidth = rect.width;
    const labelHeight = rect.height;

    // Center label on object
    labelDiv.style.left = `${x - labelWidth / 2}px`;
    labelDiv.style.top  = `${y - labelHeight / 2}px`;
  }
}


// --- shape stacking ----

//constants for size of shapes, y position on ground and tolerance for shape stacking
const SHAPE_SIZE = 1;
const GROUND_Y = -0.999;
const SAME_LEVEL_EPS = SHAPE_SIZE * 0.5;

//checks if shapes overlap in XZ plane
function shapesOverlapXZ(a, b) {
  return (
    Math.abs(a.position.x - b.position.x) < SHAPE_SIZE &&
    Math.abs(a.position.z - b.position.z) < SHAPE_SIZE
  );
}

//determines whether shape should increase y position to stack on another shape
function getSupportY(shape) {
  let supportY = GROUND_Y;

  for (const other of shapes) {
    // skip if shape is self
    if (other === shape) continue;
    // skip if shape is not below or nearby in Y
    const belowOrNear = other.position.y <= shape.position.y + SAME_LEVEL_EPS;
    if (!belowOrNear) continue;
    //skip if shapes dont overlap in XZ
    if (!shapesOverlapXZ(shape, other)) continue;

    const top = other.position.y + SHAPE_SIZE;
    if (top > supportY) supportY = top;
  }

  return supportY;
}

// ---- object dragging ----

// Sets up mouse input to allow dragging 3D objects in the scene
function setupDragInput() {
  
  const ui = document.getElementById('UI');
  const canvas = renderer.domElement;

  //listen for clicks on canvas, ignore clicks on UI menu
  canvas.addEventListener('click', event => {
    if (ui && ui.contains(event.target)) {
      return;
    }

    //if currently dragging an object
    //finalise shapes position then update its status depending on position
    //then update counter
    if (draggable) {
      const previousStatus = draggable.userData.status;
      updateShapeStatus(draggable);
      updateCounter();

      //play sound if shape moved from TODO -> DONE
      if (draggable.userData.status === 'done' && previousStatus !== 'done'){
        doneSynth.triggerAttackRelease('C5', '0.3');
      }
      currentlySelected = null;
      //reset draggable &save
      draggable = null;
      saveShapesToStorage();
      return;
    } 
    // else, set click position co ords
    clickMouse.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
        draggable = dragManager.pick(clickMouse);
    if (draggable){
      currentlySelected = draggable;
    }
  });

  // track mouse movement for dragging
  window.addEventListener('mousemove', event => {
    moveMouse.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
  });
}

// Drag manager object to handle picking, ground intersection, and dragging updates
const dragManager = {
  //all draggable objects
  draggables: () => scene.children.filter(o => o.userData?.draggable),
  //all ground objecst
  groundObjects: () => scene.children.filter(o => o.userData?.ground),

  //Picks the topmost draggable object under the mouse cursor
  pick(mouse) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(this.draggables(), false);
    return intersects.length > 0 ? intersects[0].object : null;
  },

  // Finds the intersection point with the ground objects under the mouse cursor
  getGroundPoint(mouse) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(this.groundObjects(), false);
    return intersects.length > 0 ? intersects[0].point : null;
  },
    
  // Updates the currently dragged object's position in real time, then updates counter
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


//---- shape status and saving -----

//Converts a 3D mesh object into a plain descriptor object so it can be saved to memory
function shapeToDescriptor(mesh) {
  return {
    type: mesh.userData.name || 'cube',
    x: mesh.position.x,
    y: mesh.position.y,
    z: mesh.position.z,
    color: mesh.material?.color?.getStyle ? mesh.material.color.getStyle() : '#1475b5',
    label: objectLabels.get(mesh)?.textContent || '',
    status: mesh.userData.status || 'todo'

  };
}
// Creates a 3D shape from a descriptor object (as saved in storage)
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

// Key used for storing shapes in localStorage
const SHAPES_KEY = 'myShapes_v1';

// Saves all current shapes to localStorage
// Converts each shape to a descriptor object and stores JSON string
function saveShapesToStorage() {
  try {
    const descriptors = shapes.map(shapeToDescriptor);
    localStorage.setItem(SHAPES_KEY, JSON.stringify(descriptors));
  } catch (err) {
    console.warn('Failed to save shapes', err);
  }
}

// Loads shapes from localStorage and recreates them in the scene
// Updates the UI counter after loading
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

// Updates a shape's status based on its X position
// Floor 1 (x = -10 to 10) = TODO, Floor 2 (x = 10 to 30) = DONE
function updateShapeStatus(shape) {
  if (shape.position.x >= -10 && shape.position.x <= 10) {
    shape.userData.status = 'todo';  // Floor 1 (gold)
  } else if (shape.position.x >= 10 && shape.position.x <= 30) {
    shape.userData.status = 'done';  // Floor 2 (blue)
  }
}

// Updates the displayed counts of 'todo' and 'done' shapes in the UI
function updateCounter() {
  const todoCount = shapes.filter(s => {
    return s.userData.status === 'todo';
  }).length;
  
    const doneCount = shapes.filter(s => {
    return s.userData.status === 'done';
  }).length;
    
  document.getElementById('counter').textContent = `ToDo: ${todoCount} | Done: ${doneCount}`;
}

// ---------- input ----------

// Sets up all UI input elements and their event listeners
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

// Sets up click events for color swatches 
// Updates currentColor variable and visually highlights the selected swatch
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

// Sets up click events for shape swatches 
// Updates currentShape variable and visually highlights the selected swatch
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

// Sets up the spawn button which creates a new shape with current selections 
// Resets the input field and currentLabel after spawning
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
// Sets up the Clear buttons to remove specified shapes from scene and storage
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

// Sets up a collapsible "hamburger" menu toggle for UI elements. Toggles CSS classes to collapse or expand the menu, UI panel, and drag handle
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


//----- functions called every frame ---

// updates the orbit controls and synchronizes label positions
function update() {
  orbit.update();
  updateLabels(); 
}

// handles object dragging and renders the scene from the camera's perspective
function render() {
  dragManager.update();  // ← single call handles ALL dragging
  renderer.render(scene, camera);
}

// ---- start animation loop and call fucntions for animation-----
function play() {
  renderer.setAnimationLoop(() => {
    update();
    render();
  });
}

// --- resize  to matche new window dimensions ----
function onWindowResize() {
  sceneHeight = window.innerHeight;
  sceneWidth = window.innerWidth;
  renderer.setSize(sceneWidth, sceneHeight);
  camera.aspect = sceneWidth / sceneHeight;
  camera.updateProjectionMatrix();
}

// ---------- start ----------

init();