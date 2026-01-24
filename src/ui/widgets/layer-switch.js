export class LayerSwitcher {
  constructor(map) {
    this.map = map;
    this.element = this.render();
  }

  render() {
    // 1. Create the widget content
    const container = document.createElement("div");
    // Apply styles from style.css
    container.className = "gis-widget layer-switcher";

    container.innerHTML = `
      <h4>Data Layers</h4>
      <div class="layer-list"></div>
    `;
    return container;
  }

  addLayer(name, controller) {
    const list = this.element.querySelector(".layer-list");
    const row = document.createElement("div");
    row.className = "layer-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;

    // Toggle logic - supports multiple method names
    checkbox.onchange = (e) => {
      if (controller.setVisible) {
        // DynamicHeatmap method
        controller.setVisible(e.target.checked);
      } else if (controller.toggle) {
        // createVector wrapper method
        controller.toggle(e.target.checked);
      } else if (
        controller.setVisible !== undefined &&
        typeof controller.setVisible === "function"
      ) {
        // OpenLayers layer method
        controller.setVisible(e.target.checked);
      }
    };

    const label = document.createElement("span");
    label.innerText = name;
    label.onclick = () => checkbox.click(); // Clicking text toggles box

    row.appendChild(checkbox);
    row.appendChild(label);
    list.appendChild(row);
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
