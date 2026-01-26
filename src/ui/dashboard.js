// Dashboard Sidebar Component
// Handles sidebar open/close, chart area, and analytics widgets

export class Dashboard {
  /**
   * @param {Object} options
   * @param {'left'|'right'|'bottom'} [options.position='left']
   * @param {Array<HTMLElement>} [options.sections] - Array of elements to add to dashboard-content
   */
  constructor({ position = "left", sections = [] } = {}) {
    this.position = position;
    this.sections = sections;
    this.element = this.render();
    this.isCollapsed = false;
    this.setupToggle();
  }

  render() {
    const sidebar = document.createElement("div");
    sidebar.className = `dashboard-sidebar dashboard-${this.position}`;
    sidebar.innerHTML = `
      <button class="dashboard-toggle" title="Toggle Sidebar">&#9776;</button>
      <div class="dashboard-content"></div>
    `;
    // Add custom sections
    const content = sidebar.querySelector(".dashboard-content");
    this.sections.forEach((el) => content.appendChild(el));
    return sidebar;
  }

  setupToggle() {
    const toggleBtn = this.element.querySelector(".dashboard-toggle");
    toggleBtn.onclick = () => {
      this.isCollapsed = !this.isCollapsed;
      this.element.classList.toggle("collapsed", this.isCollapsed);
    };
  }

  mount(target = document.body) {
    if (this.position === "right") {
      target.appendChild(this.element);
    } else if (this.position === "bottom") {
      target.appendChild(this.element);
    } else {
      target.prepend(this.element);
    }
  }
}
