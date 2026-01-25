// src/ui/drawer.js
// Generic flyout drawer utility for reuse

export class Drawer {
  /**
   * @param {Object} options
   * @param {string} options.id - Unique id for the drawer DOM element
   * @param {string} options.header - Drawer header text or HTML
   * @param {string|HTMLElement} options.content - Drawer content (element or selector or HTML)
   * @param {HTMLElement} options.triggerEl - The element that triggers the drawer (e.g., sidebar icon)
   * @param {string} [options.position='right'] - Drawer position (right/left)
   * @param {boolean} [options.sticky=false] - If true, click toggles sticky open/close
   */
  constructor({
    id,
    header,
    content,
    triggerEl,
    position = "right",
    sticky = false,
  }) {
    this.id = id;
    this.header = header;
    this.content = content;
    this.triggerEl = triggerEl;
    this.position = position;
    this.sticky = sticky;
    this.stickyOpen = false;
    this.flyoutTimer = null;
    this.drawer = this._createDrawer();
    this._attachEvents();
  }

  _createDrawer() {
    let drawer = document.getElementById(this.id);
    if (!drawer) {
      drawer = document.createElement("div");
      drawer.id = this.id;
      drawer.className = `sidebar-flyout-drawer ${this.position}`;
      drawer.innerHTML = `
        <div class="sidebar-flyout-header">${this.header}</div>
        <div class="sidebar-flyout-content"></div>
      `;
      document.body.appendChild(drawer);
    }
    // Set content
    const contentEl = drawer.querySelector(".sidebar-flyout-content");
    if (typeof this.content === "string") {
      // If selector, try to move element
      if (this.content.startsWith("#") || this.content.startsWith(".")) {
        const el = document.querySelector(this.content);
        if (el) contentEl.appendChild(el);
        else contentEl.innerHTML = "";
      } else {
        contentEl.innerHTML = this.content;
      }
    } else if (this.content instanceof HTMLElement) {
      contentEl.appendChild(this.content);
    }
    return drawer;
  }

  _attachEvents() {
    const drawer = this.drawer;
    const iconEl = this.triggerEl;
    const self = this;
    function openFlyout() {
      clearTimeout(self.flyoutTimer);
      drawer.classList.add("open");
      iconEl.classList.add("active");
    }
    function closeFlyout() {
      self.flyoutTimer = setTimeout(() => {
        if (!self.stickyOpen) {
          drawer.classList.remove("open");
          iconEl.classList.remove("active");
        }
      }, 120);
    }
    iconEl.addEventListener("mouseenter", openFlyout);
    iconEl.addEventListener("mouseleave", closeFlyout);
    drawer.addEventListener("mouseenter", openFlyout);
    drawer.addEventListener("mouseleave", closeFlyout);
    iconEl.addEventListener("click", () => {
      if (!self.sticky) return;
      self.stickyOpen = !self.stickyOpen;
      if (self.stickyOpen) {
        openFlyout();
      } else {
        drawer.classList.remove("open");
        iconEl.classList.remove("active");
      }
    });
  }

  get element() {
    return this.drawer;
  }
}
