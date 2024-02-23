import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';

import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/controls/OrbitControls.js';

class BasicWorldDemo {
    constructor() {
        this._Initialize();
    }

    _Initialize() {
        this.collisionConfiguration

        // Initialize Renderer
        this._threejs = new THREE.WebGLRenderer({
            antialias: true,
        });
        this._threejs.shadowMap.enabled = true;
        this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
        this._threejs.setPixelRatio(window.devicePixelRatio);
        this._threejs.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this._threejs.domElement);

        window.addEventListener('resize', () => {
            this._OnWindowResize();
        }, false);

        // Perspective Camera
        const fov = 60; 
        const aspect = 1920 / 1080;
        const near = 1.0;
        const far = 1000.0;
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(75,20,0); 

        this._scene = new THREE.Scene();

        // Scene Light
        let light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
        light.position.set(20, 100, 10);
        light.target.position.set(0,0,0);
        light.castShadow = true;
        light.shadow.bias = -0.001;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 500.0;
        light.shadow.camera.left = 100;
        light.shadow.camera.right = -100;
        light.shadow.camera.top = 100;
        light.shadow.camera.bottom = 100;
        this._scene.add(light);

        // Orbit Controls (Mouse)
        const controls = new OrbitControls(this._camera, this._threejs.domElement);
        controls.target.set(0, 20, 0);
        controls.update();

        // Skybox
        const loader = new THREE.CubeTextureLoader();
        const texture = loader.load([
            './resources/vz_classic_land_front.png',
            './resources/vz_classic_land_back.png',
            './resources/vz_classic_land_up.png',
            './resources/vz_classic_land_down.png',
            './resources/vz_classic_land_left.png',
            './resources/vz_classic_land_right.png'
        ]);
        this._scene.background = texture;

        // Floor
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100, 10, 10),
            new THREE.MeshStandardMaterial({
                color: 0xFFFFFF,
              }));
        plane.castShadow = false;
        plane.receiveShadow = true;
        plane.rotation.x = -Math.PI / 2;
        this._scene.add(plane);

        // Actual Scene
    
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(2, 2, 2),
          new THREE.MeshStandardMaterial({
              color: 0xFFFFFF,
          }));
        box.position.set(0, 1, 0);
        box.castShadow = true;
        box.receiveShadow = true;
        this._scene.add(box);
    
        for (let x = -8; x < 8; x++) {
          for (let y = -8; y < 8; y++) {
            const box = new THREE.Mesh(
              new THREE.BoxGeometry(2, 2, 2),
              new THREE.MeshStandardMaterial({
                  color: 0x808080,
              }));
            box.position.set(Math.random() + x * 5, Math.random() * 4.0 + 2.0, Math.random() + y * 5);
            box.castShadow = true;
            box.receiveShadow = true;
            this._scene.add(box);
          }
        }

        this._RAF();
    }

    _OnWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this._threejs.setSize(window.innerWidth, window.innerHeight);
    }

    _RAF() {
        requestAnimationFrame(() => {
            this._threejs.render(this._scene, this._camera);
            this._RAF();
        });
    }
}

let _APP = null;
window.addEventListener('DOMContentLoaded', () => {
    _APP = new BasicWorldDemo();
})