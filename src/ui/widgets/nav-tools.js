/**
 * Navigation toolbar widget
 * Buttons: Zoom In, Zoom Out, Zoom Window (drag rectangle), 3D Toggle
 */
import DragZoom from "ol/interaction/DragZoom";

export class NavTools {
  constructor(map, v3dEngine = null) {
    this.map = map;
    this.v3dEngine = v3dEngine;
    this.element = this.render();
    this.dragZoom = null;
    this.activeDrag = false;
    this.zoomWindowBtn = null;
    this.toggle3DBtn = null;
    this.setupHandlers();
  }

  render() {
    const container = document.createElement("div");
    container.className = "gis-widget nav-tools";
    container.innerHTML = `
      <div class="nav-title">Navigation</div>
      <div class="nav-buttons">
        <button class="nav-btn" data-action="zoom-in">＋</button>
        <button class="nav-btn" data-action="zoom-out">－</button>
        <button class="nav-btn" data-action="zoom-window">□</button>
        ${this.v3dEngine ? '<button class="nav-btn" data-action="toggle-3d">3D</button>' : ""}
      </div>
      <div class="nav-hint" id="nav-hint" style="display:none;">Drag to zoom</div>
    `;
    return container;
  }

  setupHandlers() {
    this.zoomWindowBtn = this.element.querySelector(
      '.nav-btn[data-action="zoom-window"]',
    );
    this.toggle3DBtn = this.element.querySelector(
      '.nav-btn[data-action="toggle-3d"]',
    );
    const buttons = this.element.querySelectorAll(".nav-btn");
    buttons.forEach((btn) => {
      btn.onclick = () => {
        const action = btn.dataset.action;
        if (action === "zoom-in") {
          this.zoomIn();
        } else if (action === "zoom-out") {
          this.zoomOut();
        } else if (action === "zoom-window") {
          this.toggleDragZoom();
        } else if (action === "toggle-3d") {
          this.toggle3D();
        }
      };
    });
  }

  zoomIn() {
    const view = this.map.getView();
    view.setZoom(view.getZoom() + 1);
  }

  zoomOut() {
    const view = this.map.getView();
    view.setZoom(view.getZoom() - 1);
  }

  toggleDragZoom() {
    if (this.activeDrag) {
      this.deactivateDragZoom();
      return;
    }
    this.activateDragZoom();
  }

  activateDragZoom() {
    if (this.dragZoom) {
      this.map.removeInteraction(this.dragZoom);
    }
    this.dragZoom = new DragZoom({
      condition: () => true, // always allow drag zoom when armed
      out: false,
    });
    this.map.addInteraction(this.dragZoom);
    this.activeDrag = true;
    this.element.querySelector("#nav-hint").style.display = "block";
    if (this.zoomWindowBtn) {
      this.zoomWindowBtn.classList.add("active");
    }
  }

  deactivateDragZoom() {
    if (this.dragZoom) {
      this.map.removeInteraction(this.dragZoom);
      this.dragZoom = null;
    }
    this.activeDrag = false;
    this.element.querySelector("#nav-hint").style.display = "none";
    if (this.zoomWindowBtn) {
      this.zoomWindowBtn.classList.remove("active");
    }
  }

  toggle3D() {
    if (!this.v3dEngine) {
      console.warn("3D Engine not available");
      return;
    }

    const is3DEnabled = this.v3dEngine.toggle();

    if (this.toggle3DBtn) {
      if (is3DEnabled) {
        this.toggle3DBtn.classList.add("active");
        this.toggle3DBtn.textContent = "2D";
      } else {
        this.toggle3DBtn.classList.remove("active");
        this.toggle3DBtn.textContent = "3D";
      }
    }
  }

  mount(target) {
    let parent;
    if (!target) {
      const id = "gis-nav-tools";
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement("div");
        el.id = id;
        el.className = "floating-top-right nav-tools-slot";
        document.body.appendChild(el);
      }
      parent = el;
    } else if (target instanceof HTMLElement) {
      parent = target;
    } else if (typeof target === "string") {
      const found = document.querySelector(target);
      if (found) {
        parent = found;
      } else {
        const el = document.createElement("div");
        if (target.startsWith("#")) el.id = target.substring(1);
        else if (target.startsWith(".")) el.className = target.substring(1);
        else el.id = target;
        document.body.appendChild(el);
        parent = el;
      }
    }
    parent.appendChild(this.element);
  }

  destroy() {
    this.deactivateDragZoom();
    if (this.element?.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}
