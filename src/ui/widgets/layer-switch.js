export class LayerSwitcher {
  /**
   * @param {ol.Map} map - The OpenLayers map instance
   * @param {Object} [options] - Optional config
   * @param {('left'|'right')} [options.buttonPosition='right'] - Where to place up/down buttons relative to label
   */
  constructor(map, options = {}) {
    this.map = map;
    this.layers = [];
    this.element = this.render();
    this.buttonPosition = options.buttonPosition || "right";
  }

  update() {
    // Re-render the layer list UI after reordering
    const list = this.element.querySelector(".layer-list");
    if (!list) return;
    list.innerHTML = "";
    this.layers.forEach(({ name, layer }, idx) => {
      // Grid: [checkbox] [label] [up] [down]
      const row = document.createElement("div");
      row.className = "layer-row";

      // Checkbox
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = layer.getVisible ? layer.getVisible() : true;
      checkbox.onchange = (e) => {
        if (layer.setVisible) {
          layer.setVisible(e.target.checked);
        } else if (layer.toggle) {
          layer.toggle(e.target.checked);
        }
      };

      // Label
      const label = document.createElement("span");
      label.innerText = name;
      label.onclick = () => checkbox.click();

      // Up button (always rendered, but disabled/hidden if first)
      const upBtn = document.createElement("button");
      upBtn.textContent = "▲";
      upBtn.title = "Move up";
      if (idx === 0) {
        upBtn.disabled = true;
        upBtn.style.visibility = "hidden";
      } else {
        upBtn.onclick = (e) => {
          e.stopPropagation();
          this.moveLayer(name, -1);
        };
      }

      // Down button (always rendered, but disabled/hidden if last)
      const downBtn = document.createElement("button");
      downBtn.textContent = "▼";
      downBtn.title = "Move down";
      if (idx === this.layers.length - 1) {
        downBtn.disabled = true;
        downBtn.style.visibility = "hidden";
      } else {
        downBtn.onclick = (e) => {
          e.stopPropagation();
          this.moveLayer(name, 1);
        };
      }

      // Place in grid: [checkbox] [label] [up] [down]
      row.appendChild(checkbox);
      row.appendChild(label);
      row.appendChild(upBtn);
      row.appendChild(downBtn);
      list.appendChild(row);
    });
  }

  render() {
    // 1. Create the widget content
    const container = document.createElement("div");
    container.className = "layer-switcher";

    container.innerHTML = `
      <div class="layer-list"></div>
    `;
    return container;
  }

  addLayer(name, controller) {
    // Add to internal layers array if not already present
    if (!this.layers.some((l) => l.name === name)) {
      this.layers.push({ name, layer: controller });
      this.update();
    }
  }

  moveLayer(name, direction) {
    const idx = this.layers.findIndex((l) => l.name === name);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= this.layers.length) return;
    // Swap in array
    const temp = this.layers[newIdx];
    this.layers[newIdx] = this.layers[idx];
    this.layers[idx] = temp;
    // Update map layer order (top = last in array)
    if (this.map && this.map.getLayers) {
      const olLayers = this.map.getLayers().getArray();
      // Remove and re-insert in new order
      this.layers.forEach(({ layer }) => {
        if (olLayers.includes(layer)) {
          this.map.removeLayer(layer);
          this.map.addLayer(layer);
        }
      });
    }
    // Re-render UI
    this.update();
  }

  /**
   * Mounts the widget.
   * Logic:
   * 1. If 'target' is a string, look for it.
   * 2. If NOT found, CREATE it with that ID/Class.
   * 3. Append widget to it.
   */
  mount(target) {
    let parentElement;

    if (!target) {
      // Default: Create a floating dock if no argument passed
      const defaultId = "gis-floating-dock";
      let dock = document.getElementById(defaultId);
      if (!dock) {
        dock = document.createElement("div");
        dock.id = defaultId;
        dock.className = "floating-top-right"; // Default positioning
        document.body.appendChild(dock);
      }
      parentElement = dock;
    } else if (target instanceof HTMLElement) {
      parentElement = target;
    } else if (typeof target === "string") {
      // Try to find the element
      const found = document.querySelector(target);

      if (found) {
        parentElement = found;
      } else {
        // --- CREATION LOGIC ---
        console.log(`Target "${target}" not found. Creating it...`);
        parentElement = document.createElement("div");

        // Parse selector to assign ID or Class
        if (target.startsWith("#")) {
          parentElement.id = target.substring(1);
        } else if (target.startsWith(".")) {
          parentElement.className = target.substring(1);
        } else {
          // If just "sidebar", assume it's an ID
          parentElement.id = target;
        }

        // Append the new container to the body so it exists in DOM
        document.body.appendChild(parentElement);
      }
    }

    // Finally, inject the widget
    if (parentElement) {
      parentElement.appendChild(this.element);
    }
  }
}
