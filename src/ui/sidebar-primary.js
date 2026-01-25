// Primary Sidebar (Iconic Vertical Bar)
// Shows icons for each main section, triggers flyout drawers

export class SidebarPrimary {
  /**
   * @param {Object} options
   * @param {Array} options.icons
   * @param {string} [options.position='left'] - 'left' or 'right'
   */
  constructor({ icons = [], position = "left" } = {}) {
    this.icons = icons;
    this.position = position;
    this.element = this.render();
    this.active = null;
    this.setupHandlers();
  }

  render() {
    const bar = document.createElement("nav");
    bar.className = "sidebar-primary";
    bar.classList.add(`sidebar-primary-${this.position}`);
    bar.innerHTML = this.icons
      .map(
        (icon) => `
      <div class="sidebar-icon" data-key="${icon.key}" title="${icon.label}">
        <span class="icon">${icon.svg}</span>
      </div>
    `,
      )
      .join("");
    return bar;
  }

  setupHandlers() {
    this.element.querySelectorAll(".sidebar-icon").forEach((iconEl) => {
      iconEl.addEventListener("mouseenter", () => {
        this.setActive(iconEl.dataset.key);
      });
      iconEl.addEventListener("mouseleave", () => {
        this.setActive(null);
      });
      iconEl.addEventListener("click", () => {
        this.setActive(iconEl.dataset.key);
      });
    });
  }

  setActive(key) {
    this.active = key;
    this.element.querySelectorAll(".sidebar-icon").forEach((iconEl) => {
      iconEl.classList.toggle("active", iconEl.dataset.key === key);
    });
    this.onActiveChange && this.onActiveChange(key);
  }

  mount(target = document.body) {
    if (this.position === "right") {
      target.appendChild(this.element);
    } else {
      target.prepend(this.element);
    }
  }
}
