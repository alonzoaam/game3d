import * as THREE from 'https://cdn.skypack.dev/three@0.136';

import {FirstPersonControls} from 'https://cdn.skypack.dev/three@0.136/examples/jsm/controls/FirstPersonControls.js';

const KEYS = {
    'w': 87,
    'a': 65,
    's': 83,
    'd': 68,
    ' ': 32,
};

function clamp(x, a, b) {
    return Math.min(Math.max(x, a), b);
}

const DEFAULT_MASS = 10;

class InputController {
    constructor(target) {
        this.target_ = target || document;
        this.initialize_();
    }

    initialize_() {
        this.current_ = {
            leftButton: false,
            rightButton: false,
            mouseXDelta: 0,
            mouseYDelta: 0,
            mouseX: 0,
            mouseY: 0,
        };
        this.previous_ = null;
        this.keys_ = {};
        this.previousKeys_ = {};
        this.target_.addEventListener('mousedown', (e) => this.onMouseDown_(e), false);
        this.target_.addEventListener('mousemove', (e) => this.onMouseMove_(e), false);
        this.target_.addEventListener('mouseup', (e) => this.onMouseUp_(e), false);
        this.target_.addEventListener('keydown', (e) => this.onKeyDown_(e), false);
        this.target_.addEventListener('keyup', (e) => this.onKeyUp_(e), false);
    }

    onMouseMove_(e) {
        this.current_.mouseX = e.pageX - window.innerWidth / 2;
        this.current_.mouseY = e.pageY - window.innerHeight / 2;

        if (this.previous_ === null) {
            this.previous_ = {...this.current_};
        }

        this.current_.mouseXDelta = this.current_.mouseX - this.previous_.mouseX;
        this.current_.mouseYDelta = this.current_.mouseY - this.previous_.mouseY;
    }

    onMouseDown_(e) {
        this.onMouseMove_(e);

        switch (e.button) {
            case 0: { 
                this.current_.leftButton = true;
                break;
            }
            case 2: {
                this.current_.rightButton = false;
                break;
            }
        }
    }

    onMouseUp_(e) {
        this.onMouseMove_(e);

        switch (e.button) {
            case 0: {
                this.current_.leftButton = false;
                break;
            }
            case 2: {
                this.current_.rightButton = false;
                break;
            }
        }
    }

    onKeyDown_(e) {
        this.keys_[e.keyCode] = true;
    }

    onKeyUp_(e) {
        this.keys_[e.keyCode] = false;
    }

    key(keyCode) {
        return !!this.keys_[keyCode];
    }

    isReady() {
        return this.previous_ !== null;
    }

    update(_) {
        if (this.previous_ !== null) {
            this.current_.mouseXDelta = this.current_.mouseX - this.previous_.mouseX;
            this.current_.mouseYDelta = this.current_.mouseY - this.previous_.mouseY;

            this.previous_ = {...this.current_};
        }
    }
};

class FirstPersonCamera {
    constructor(camera) {
        this.camera_ = camera;
        this.input_ = new InputController();
        this.rotation_ = new THREE.Quaternion();
        this.translation_ = new THREE.Vector3(0, 2, 0);
        this.phi_ = 0;
        this.phiSpeed_ = 1;
        this.theta_ = 0;
        this.thetaSpeed_ = 1;
    }

    update(timeElapsedS) {
        this.updateRotation_(timeElapsedS);
        this.updateCamera_(timeElapsedS);
        this.updateTranslation_(timeElapsedS);

        this.input_.update(timeElapsedS);
    }

    updateCamera_(_) {
        this.camera_.quaternion.copy(this.rotation_);
        this.camera_.position.copy(this.translation_);
    }

    updateTranslation_(timeElapsedS) {
        const forwardVelocity = (this.input_.key(KEYS.w) ? 1 : 0) + (this.input_.key(KEYS.s) ? -1 : 0);
        const strafeVelocity = (this.input_.key(KEYS.a) ? 1: 0) + (this.input_.key(KEYS.d) ? -1: 0);

        const qx = new THREE.Quaternion();
        qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_);

        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(qx);
        forward.multiplyScalar(forwardVelocity * timeElapsedS * 10);

        const left = new THREE.Vector3(-1, 0, 0);
        left.applyQuaternion(qx);
        left.multiplyScalar(strafeVelocity * timeElapsedS * 10);

        this.translation_.add(forward);
        this.translation_.add(left);
    }

    updateRotation_(timeElapsedS) {
        const xh = this.input_.current_.mouseXDelta / window.innerWidth;
        const yh = this.input_.current_.mouseYDelta / window.innerHeight;

        this.phi_ += -xh * this.phiSpeed_;
        this.theta_ = clamp(this.theta_ + -yh * this.thetaSpeed_, -Math.PI / 3, Math.PI / 3);
        const qx = new THREE.Quaternion();
        qx.setFromAxisAngle(new THREE.Vector3(0.0, 1.0, 0.0), this.phi_);
        const qz = new THREE.Quaternion();
        qz.setFromAxisAngle(new THREE.Vector3(1.0, 0.0, 0.0), this.theta_);

        const q = new THREE.Quaternion();
        q.multiply(qx);
        q.multiply(qz);

        this.rotation_.copy(q);
    }

}

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

class World {
    constructor() {
        this.initialize_();
    }

    initialize_() {
        this.initializeRenderer_();
        this.initializeLights_();
        this.initializeScene_();
        this.initializePostFX_();
        this.initializeDemo_();
        
        this.previousRAF_ = null;
        this.RAF_();
        this.onWindowResize_();
    }

    initializeRenderer_() {
        this.collisionConfiguration_ = new Ammo.btDefaultCollisionConfiguration();
        this.dispatcher_ = new Ammo.btCollisionDispatcher(this.collisionConfiguration_);
        this.broadphase_ = new Ammo.btDbvtBroadphase();
        this.solver_ = new Ammo.btSequentialImpulseConstraintSolver();
        this.physicsWorld_ = new Ammo.btDiscreteDynamicsWorld(this.dispatcher_, this.broadphase_, this.solver_, this.collisionConfiguration_);
        this.physicsWorld_.setGravity(new Ammo.btVector3(0, -100, 0));

        this.threejs_ = new THREE.WebGLRenderer({
            antialias: true,
        });
        this.threejs_.shadowMap.enabled = true;
        this.threejs_.shadowMap.type = THREE.PCFSoftShadowMap;
        this.threejs_.setPixelRatio(window.devicePixelRatio);
        this.threejs_.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this.threejs_.domElement);

        window.addEventListener('resize', () => {
            this.onWindowResize_();
        }, false);

        const fov = 60; 
        const aspect = 1920 / 1080;
        const near = 1.0;
        const far = 1000.0;
        this.camera_ = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this.camera_.position.set(0,2,0); 

        this.scene_ = new THREE.Scene();
    }

    initializeScene_() {
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
        this.scene_.background = texture;

        // Scene 

        // Floor
        const ground = new THREE.Mesh(
            new THREE.BoxGeometry(10000, 1, 10000),
            new THREE.MeshStandardMaterial({color: 0x808080}));
        ground.castShadow = false;
        ground.receiveShadow = true;
        this.scene_.add(ground);

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
        this.scene_.add(box);

        const rbBox = new RigidBody();
        rbBox.createBox(10, box.position, box.quaternion, new THREE.Vector3(4, 4, 4));
        this.physicsWorld_.addRigidBody(rbBox.body_);

        this.rigidBodies_.push({mesh: box, rigidBody: rbBox});
        */

        this.tmpTransform_ = new Ammo.btTransform(); 
    }

    initializeLights_() {// Scene Light
        const distance = 50.0;
        const angle = Math.PI / 4.0;
        const penumbra = 0.5;
        const decay = 1.0;

        let light = new THREE.SpotLight(
            0xFFFFFF, 100.0, distance, angle, penumbra, decay);
        light.castShadow = true;
        light.shadow.bias = -0.00001;
        light.shadow.mapSize.width = 4096;
        light.shadow.mapSize.height = 4096;
        light.shadow.camera.near = 1;
        light.shadow.camera.far = 100;

        light.position.set(25, 25, 0);
        light.lookAt(0, 0, 0);
        this.scene_.add(light);
    }

    initializePostFX_() {

    }

    initializeDemo_() {
        this.fpsCamera_ = new FirstPersonCamera(this.camera_);

    }

    onWindowResize_() {
        this.camera_.aspect = window.innerWidth / window.innerHeight;
        this.camera_.updateProjectionMatrix();

        this.threejs_.setSize(window.innerWidth, window.innerHeight);
    }

    RAF_() {
        requestAnimationFrame((t) => {
            if (this.previousRAF_ === null) {
                this.previousRAF_ = t;
            }

            this.step_(t - this.previousRAF_);
            this.threejs_autoClear = true;
            this.threejs_.render(this.scene_, this.camera_);
            this.RAF_();
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

        this.scene_.add(box);
    }

    step_(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001;/*
        this.physicsWorld_.stepSimulation(timeElapsedS, 10);

        for (let i = 0; i < this.rigidBodies_.length; ++i) {
            this.rigidBodies_[i].rigidBody.motionState_.getWorldTransform(this.tmpTransform_);
            const pos = this.tmpTransform_.getOrigin();
            const quat = this.tmpTransform_.getRotation();
            const pos3 = new THREE.Vector3(pos.x(), pos.y(), pos.z());
            const quat3 = new THREE.Quaternion(quat.x(), quat.y(), quat.z(), quat.w());

            this.rigidBodies_[i].mesh.position.copy(pos3);
            this.rigidBodies_[i].mesh.quaternion.copy(quat3);
        }*/

        this.fpsCamera_.update(timeElapsedS);
    }
}

let _APP = null;
window.addEventListener('DOMContentLoaded', () => {
    Ammo().then((lib => {
        Ammo = lib;
        _APP = new World();
    }))
})