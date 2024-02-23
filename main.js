import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';

import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/controls/OrbitControls.js';

import {FirstPersonControls} from 'https://cdn.skypack.dev/three@0.136/examples/jsm/controls/FirstPersonControls';

const DEFAULT_MASS = 10;

class RigidBody {
    constructor() {
    }

    setRestitution(val) {
        this.body_.setRestituion(val);
    }

    setFriction(val) {
        this.body_.setFriction(val);
    }

    setRollingFriction(val) {
        this.body_.setRollingFriction(val);
    }

    createBox(mass, pos, quat, size) {
        this.transform_ = new Ammo.btTransform();
        this.transform_.setIdentity();
        this.transform_.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        this.transform_.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
        this.motionState_ = new Ammo.btDefaultMotionState(this.transform_);

        const btSize = new Ammo.btVector3(size.x * 0.5, size.y * 0.5, size.z * 0.5);
        this.shape_ = new Ammo.btBoxShape(btSize);
        this.shape_.setMargin(0.05);

        this.inertia_ = new Ammo.btVector3(0, 0, 0);
        if (mass > 0) {
            this.shape_.calculateLocalInertia(mass, this.inertia_);
        }

        this.info_ = new Ammo.btRigidBodyConstructionInfo(
            mass, this.motionState_, this.shape_, this.inertia_);

        this.body_ = new Ammo.btRigidBody(this.info_);
        
        Ammo.destroy(btSize);
    }
}

class BasicWorldDemo {
    constructor() {
    }

    _Initialize() {
        this.collisionConfiguration_ = new Ammo.btDefaultCollisionConfiguration();
        this.dispatcher_ = new Ammo.btCollisionDispatcher(this.collisionConfiguration_);
        this.broadphase_ = new Ammo.btDbvtBroadphase();
        this.solver_ = new Ammo.btSequentialImpulseConstraintSolver();
        this.physicsWorld_ = new Ammo.btDiscreteDynamicsWorld(this.dispatcher_, this.broadphase_, this.solver_, this.collisionConfiguration_);
        this.physicsWorld_.setGravity(new Ammo.btVector3(0, -100, 0));

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

       // SCENE 

        // Floor
        const ground = new THREE.Mesh(
            new THREE.BoxGeometry(100, 1, 100),
            new THREE.MeshStandardMaterial({color: 0x808080}));
        ground.castShadow = false;
        ground.receiveShadow = true;
        this._scene.add(ground);

        const rbGround = new RigidBody();
        rbGround.createBox(0, ground.position, ground.quaternion, new THREE.Vector3(100, 1, 100));
        this.physicsWorld_.addRigidBody(rbGround.body_);

        this.rigidBodies_ = [];
        
        /* 
        const box = new THREE.Mesh(
            new THREE.BoxGeometry(4, 4, 4),
            new THREE.MeshStandardMaterial({color: 0x808080}));
        box.position.set(0,4,0);
        box.castShadow = true;
        box.receiveShadow = true;
        this._scene.add(box);

        const rbBox = new RigidBody();
        rbBox.createBox(10, box.position, box.quaternion, new THREE.Vector3(4, 4, 4));
        this.physicsWorld_.addRigidBody(rbBox.body_);

        this.rigidBodies_.push({mesh: box, rigidBody: rbBox});
        */

        this.tmpTransform_ = new Ammo.btTransform(); 
        
        this.previousRAF_ = null;
        this._RAF();
    }

    _OnWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this._threejs.setSize(window.innerWidth, window.innerHeight);
    }

    _RAF() {
        requestAnimationFrame((t) => {
            if (this.previousRAF_ === null) {
                this.previousRAF_ = t;
            }

            this.step_(t - this.previousRAF_);
            this._threejs.render(this._scene, this._camera);
            this._RAF();
        });
    }

    spawn_() {
        const scale = Math.random() * 4 + 4;
        const box = new THREE.Mesh(
            new THREE.BoxGeometry(scale, scale, scale),
            new THREE.MeshStandardMaterial({
                color: 0x808080,
            }));
        box.position.set(Math.random() * 2 - 1, 200.0, Math.random() * 2 - 1);
        box.quaternion.set(0, 0, 0, 1);
        box.castShadow = true;
        box.receiveShadow = true;

        const rb = new RigidBody();
        rb.createBox(DEFAULT_MASS, box.position, box.quaternion, new THREE.Vector3(scale, scale, scale), null);
        rb.setRestitution(0.125);
        rb.setFriction(1);
        rb.setRollingFriction(5);

        this.physicsWorld_.addRigidBody(rb.body_);

        this.rigidBodies_.push({mesh: box, rigidBody: rb});

        this._scene.add(box);
    }

    step_(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001;
        this.physicsWorld_.stepSimulation(timeElapsedS, 10);

        for (let i = 0; i < this.rigidBodies_.length; ++i) {
            this.rigidBodies_[i].rigidBody.motionState_.getWorldTransform(this.tmpTransform_);
            const pos = this.tmpTransform_.getOrigin();
            const quat = this.tmpTransform_.getRotation();
            const pos3 = new THREE.Vector3(pos.x(), pos.y(), pos.z());
            const quat3 = new THREE.Quaternion(quat.x(), quat.y(), quat.z(), quat.w());

            this.rigidBodies_[i].mesh.position.copy(pos3);
            this.rigidBodies_[i].mesh.quaternion.copy(quat3);
        }
    }
}

let _APP = null;
window.addEventListener('DOMContentLoaded', () => {
    Ammo().then((lib => {
        Ammo = lib;
        _APP = new BasicWorldDemo();
        _APP._Initialize();
    }))
})