/*

Generate 3D render using serial data from IMU

*/

'use strict';

// Declare required variables
var poseArray = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
var positionRaw = new THREE.Vector3(0.0);
var rotationRaw = new THREE.Vector3(0.0);
var position = new THREE.Vector3(0.0);
var rotation = new THREE.Vector3(0.0);
var accuracy = 2;
var orderOfMag = (Math.PI/180);
var container;
var camera, scene, renderer;
var geometry_lines;
var probe_axes, plane;
var targetRotation = 0;
var targetRotationOnMouseDown = 0;
var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;
var px_cm = 20;//no of px in 1 cm 
var dim = 3; //2D or 3D
var gridRes = 0.5*px_cm; //cm
var gridSize = 20*px_cm;
var controls;
var euler = new THREE.Euler( Math.PI/2, 0, Math.PI/2, 'XYZ' );
var imuToVizRot = new THREE.Matrix4().makeRotationFromEuler(euler);
var degToRad = Math.PI/180;

//Connect to socket.io

var serverIP = "localhost";
var port = 5000
var socket = io('http://' + serverIP + ':' + port +  '/');

// Start reading IMU data
runSocket();
init();
animate();


function runSocket() {
  socket.on('serial_update', function(data) {
    //console.log(data);
    var dataArray = data.split(" ");
    if (dataArray[0] == "error:") {
        return;
    }
    positionRaw.x = parseFloat(dataArray[0]);
    positionRaw.y = parseFloat(dataArray[1]);
    positionRaw.z = parseFloat(dataArray[2]);
    rotationRaw.x = parseFloat(dataArray[3]);
    rotationRaw.y = parseFloat(dataArray[4]);
    rotationRaw.z = parseFloat(dataArray[5]);
    
  });
}

function buildAxis( src, dst, colorHex, dashed ) {
  var geom = new THREE.Geometry(), mat; 

  if(dashed) {
    mat = new THREE.LineDashedMaterial({ linewidth: 3, color: colorHex, dashSize: 3, gapSize: 3 });
  } else {
    mat = new THREE.LineBasicMaterial({ linewidth: 3, color: colorHex });
  }

  geom.vertices.push( src.clone() );
  geom.vertices.push( dst.clone() );
  geom.computeLineDistances(); // This one is SUPER important, otherwise dashed lines will appear as simple plain lines
  var axis = new THREE.Line( geom, mat, THREE.LinePieces );
  return axis;

}

function init() {
  container = document.createElement( 'div' );
  document.body.appendChild( container );

  var info = document.createElement( 'div' );
  info.style.position = 'absolute';
  info.style.top = '10px';
  info.style.width = '100%';
  info.style.textAlign = 'center';
  info.innerHTML = 'Visualize IMU';
  info.setAttribute('id', 'pourHeading');
  container.appendChild( info );

  var poseVals = document.createElement('div');
  poseVals.style.position = 'absolute';
  poseVals.style.top = '10px';
  poseVals.style.width = '100%';
  poseVals.style.textAlign = 'center';
  poseVals.innerHTML = '';
  poseVals.setAttribute('id', 'poseVals');

  container.appendChild( poseVals );

  $("#pourHeading").append("<div id='subHeading'></div>");
  $("#poseVals").append("<div id='subHeading'></div>");


    //init imuToViz rotation mat
  

  var grid = new THREE.GridHelper(gridSize, gridSize/gridRes);
  console.log(grid);
  
  // Set up camera looking down the z axis, 100 cm away.
  if (dim == 3) {

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000 );
    camera.position.set(0*px_cm, 10*px_cm, 10*px_cm);
    camera.lookAt(new THREE.Vector3(0,0,0));

  } else if (dim == 2) {
    var lim = 10 * px_cm;
    camera = new THREE.OrthographicCamera(-lim, lim, lim, -lim, 1*px_cm, 100*px_cm);
    camera.position.set(0,0,10*px_cm);
    camera.up = new THREE.Vector3(0,1,0);
    camera.lookAt(new THREE.Vector3(0,0,0));

    grid.rotation.x = Math.PI/2;

    console.log(camera.position);
  }

  scene = new THREE.Scene();

  // Create probe_axes

  var length = 1 * px_cm; 
  
  probe_axes = new THREE.Object3D();
  probe_axes.add(buildAxis(new THREE.Vector3(0,0,0),
    new THREE.Vector3(length,0,0),0xFF0000, false)); // +X
  probe_axes.add(buildAxis(new THREE.Vector3(0,0,0),
    new THREE.Vector3(0,length,0),0x00FF00, false)); // +Y
  probe_axes.add(buildAxis(new THREE.Vector3(0,0,0),
    new THREE.Vector3(0,0,length),0x0000FF, false)); // +Z

  
  scene.add(probe_axes);

  // Create background grid
  //
  var cos45 = Math.sqrt(2)/2;
  //grid.rotation.set(0,0,cos45,cos45);
  //grid.position.set(-100,0,0);

 // grid.rotation.setFromAxisAngle(
 //   new THREE.Vector3(1,0,0), Math.PI/2);

  scene.add(grid);

  //create line array
  var material = new THREE.LineBasicMaterial({
  color: 0x0000ff
});

  geometry_lines = new THREE.Geometry();
  geometry_lines.vertices.push(
    new THREE.Vector3( 0, 0, 0 ),
    new THREE.Vector3(0,0,0).copy(position)
  );

  var line = new THREE.Line( geometry_lines, material );
  scene.add( line );

  controls = new THREE.TrackballControls( camera );
  controls.rotateSpeed = 1.0;
  controls.zoomSpeed = 0.2;
  controls.panSpeed = 0.8;

  controls.noZoom = false;
  controls.noPan = false;

  controls.staticMoving = true;
  controls.dynamicDampingFactor = 0.3;
  

  renderer = new THREE.CanvasRenderer();
  renderer.setClearColor( 0xf0f0f0 );
  renderer.setSize( window.innerWidth, window.innerHeight );

  container.appendChild( renderer.domElement );

  window.addEventListener( 'resize', onWindowResize, false );
}

function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    //camera.aspect = window.innerWidth / window.innerHeight;
    //camera.updateProjectionMatrix();

    //renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
        requestAnimationFrame( animate );
        render();
}

function render() {
     
    position.copy(positionRaw);
    rotation.copy(rotationRaw.multiplyScalar(degToRad).applyMatrix4(imuToVizRot));
    console.log(rotation);
    probe_axes.position.copy(position);
    probe_axes.rotation.copy(rotation);    //geometry_lines.vertices.push(
     // new THREE.Vector3(0.0).copy(positionRaw));
    $("#poseVals").html(
    "<p>Translation: "
    + position.x.toFixed(2) + ", " 
    + position.y.toFixed(2) + ", " 
    + position.z.toFixed(2) + "</p>" 
    + "<p>Rotation: "
    + rotation.x.toFixed(2) + ", " 
    + rotation.y.toFixed(2) + ", " 
    + rotation.z.toFixed(2) + "</p>" );
    controls.update();
    renderer.render( scene, camera );
}
