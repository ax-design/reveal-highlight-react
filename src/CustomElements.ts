import RevealStateManager, { RevealBoundaryStore } from './RevealStateManager.js';

export class AxRevealProvider extends HTMLElement {
    static readonly ElementName = 'ax-reveal-provider';
    readonly stateManager = new RevealStateManager();
}

export class AxRevealBoundary extends HTMLElement {
    static readonly storage = new RevealStateManager();
    static readonly ElementName = 'ax-reveal-bound';
    private _storage!: RevealBoundaryStore | undefined;
    static readonly removeStorageEvent = 'removeStorage';
    static readonly attachStorageEvent = 'attachStorage';
    static readonly replaceStorageEvent = 'replaceStorage';
    private get storage() {
        return this._storage;
    }
    private set storage(newS) {
        const old = this._storage;
        if (old) this.dispatchEvent(new CustomEvent(AxRevealBoundary.removeStorageEvent, { detail: old }));
        if (newS) {
            this._storage = newS;
            this.dispatchEvent(new CustomEvent(AxRevealBoundary.attachStorageEvent, { detail: this._storage }));
            if (old)
                this.dispatchEvent(
                    new CustomEvent(AxRevealBoundary.replaceStorageEvent, { detail: { old, new: newS } })
                );
        }
    }
    public waitForStorage(f: (storage: RevealBoundaryStore) => void) {
        if (this.storage === undefined)
            this.addEventListener(AxRevealBoundary.attachStorageEvent, () => f(this.storage!), {
                once: true
            });
        else f(this.storage);
    }
    private appendStorage(force = false) {
        if (!force) if (this.storage) return;
        const parent = this.closest(AxRevealProvider.ElementName) as AxRevealProvider;
        const stateManager = parent ? parent.stateManager : AxRevealBoundary.storage;
        this.storage = stateManager.newBoundary();
    }
    updatePointerPosition = (ev: MouseEvent) => {
        this.waitForStorage(storage => {
            storage.clientX = ev.clientX;
            storage.clientY = ev.clientY;
        });
    }
    handlePointerEnter = () => this.waitForStorage(storage => storage.onPointerEnterBoundary());
    handlePointerLeave = () => this.waitForStorage(storage => storage.onPointerLeaveBoundary());
    handlePointerMove = (ev: MouseEvent) => this.updatePointerPosition(ev);
    handlePointerDown = (ev: MouseEvent) => this.waitForStorage(storage => {
        this.updatePointerPosition(ev);
        storage.initializeAnimation();
    });
    handlePointerUp = () => this.waitForStorage(storage => storage.switchAnimation());
    connectedCallback() {
        this.appendStorage(true);
        this.addEventListener('pointerenter', this.handlePointerEnter);
        this.addEventListener('pointerleave', this.handlePointerLeave);
        this.addEventListener('pointermove', this.handlePointerMove);
        this.addEventListener('pointerdown', this.handlePointerDown);
        this.addEventListener('pointerup', this.handlePointerUp);
    }
    disconnectedCallback() {
        this.storage = undefined;
    }
}

export class AxReveal extends HTMLElement {
    static readonly ElementName = 'ax-reveal';
    private root = this.attachShadow({ mode: 'open' });
    private canvas: HTMLCanvasElement;
    private boundary!: AxRevealBoundary;
    adoptedCallback() {
        this.disconnectedCallback();
        this.connectedCallback();
    }
    disconnectedCallback() {
        this.boundary && this.boundary.waitForStorage(storage => storage.removeReveal(this.canvas));
    }
    connectedCallback() {
        this.boundary = this.closest(AxRevealBoundary.ElementName) as AxRevealBoundary;
        if (!this.boundary)
            throw new SyntaxError('You must use ' + AxRevealBoundary.ElementName + ' as the boundary of acrylic!');

        this.boundary.waitForStorage(storage => setTimeout(() => storage.addReveal(this.canvas), 0));
    }
    constructor() {
        super();
        this.root.innerHTML = `
<div>
    <slot></slot>
    <canvas></canvas>
    </div>
<style>
    div { display: content; }
    canvas { top: 0; left: 0; pointer-events: none; width: 100%; height: 100%; position: absolute; }
    :host { display: inline-block; position: relative; }
    :host([block]) { display: block; }
    :host([inline-block]) { display: inline-block; }
    :host([flex]) { display: flex; }
    :host([inline-flex]) { display: inline-flex; }
    :host([grid]) { display: grid; }
    :host([inline-grid]) { display: inline-grid; }
    ::slotted(button) { outline:none; }
</style>`;
        this.canvas = this.root.querySelector('canvas')!;
    }
}