// DashboardRight Sidebar Component (Tabbed)
// Handles right sidebar open/close and tabbed widget area

export class DashboardRight {
  constructor() {
    this.element = this.render();
    this.isCollapsed = false;
    this.setupToggle();
    this.setupMenuNav();
  }

  render() {
    const sidebar = document.createElement("div");
    sidebar.className = "dashboard-sidebar dashboard-right";
    sidebar.innerHTML = `
      <button class="dashboard-toggle" title="Toggle Sidebar">&#9776;</button>
      <nav class="dashboard-menu-nav">
        <div class="dashboard-menu-item" data-menu="layers">
          <div class="dashboard-menu-title">Layers</div>
          <div class="dashboard-subnav" data-menu="layers"></div>
        </div>
        <!-- Add more menu items here -->
      </nav>
    `;
    return sidebar;
  }

  setupToggle() {
    const toggleBtn = this.element.querySelector(".dashboard-toggle");
    toggleBtn.onclick = () => {
      this.isCollapsed = !this.isCollapsed;
      this.element.classList.toggle("collapsed", this.isCollapsed);
    };
  }

  setupMenuNav() {
    const menuItems = this.element.querySelectorAll(".dashboard-menu-item");
    menuItems.forEach((item) => {
      const title = item.querySelector(".dashboard-menu-title");
      const subnav = item.querySelector(".dashboard-subnav");
      title.onclick = () => {
        // Toggle this submenu
        const isOpen = subnav.style.display === "block";
        // Optionally close all others
        menuItems.forEach((i) => {
          i.querySelector(".dashboard-subnav").style.display = "none";
          i.querySelector(".dashboard-menu-title").classList.remove("active");
        });
        if (!isOpen) {
          subnav.style.display = "block";
          title.classList.add("active");
        }
      };
    });
    // Open first menu by default
    if (menuItems.length)
      menuItems[0].querySelector(".dashboard-menu-title").click();
  }

  mount(target = document.body) {
    target.appendChild(this.element);
  }

  /**
   * Add a widget to a specific tab panel
   * @param {HTMLElement} widgetElement
   * @param {string} tabName
   */
  addWidget(widgetElement, menuName = "layers") {
    const subnav = this.element.querySelector(
      `.dashboard-subnav[data-menu="${menuName}"]`,
    );
    if (subnav) {
      subnav.appendChild(widgetElement);
    }
  }
}
