export default function ClassroomVisualSystem() {
  return (
    <style jsx global>{`
      :root {
        --font-sans: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Segoe UI", Arial, sans-serif;
      }

      :root:not([data-theme="dark"]) {
        --canvas: #ffffff;
        --surface: rgba(255, 255, 255, 0.72);
        --surface-raised: rgba(255, 255, 255, 0.82);
        --bg-primary: #ffffff;
        --bg-secondary: rgba(255, 255, 255, 0.76);
        --bg-tertiary: rgba(255, 255, 255, 0.64);
        --bg-hover: #f7f7f6;
        --sand: #ffffff;
        --accent-glow: #ffffff;
        --line: rgba(17, 18, 15, 0.13);
        --border-default: rgba(17, 18, 15, 0.13);
        --border-subtle: rgba(17, 18, 15, 0.09);
      }

      body,
      button,
      input,
      textarea,
      select {
        font-family: var(--font-sans);
      }

      body { line-height: 1.45; }
      :root:not([data-theme="dark"]) body,
      :root:not([data-theme="dark"]) .app-shell,
      :root:not([data-theme="dark"]) .main-content {
        background: #ffffff !important;
      }

      :root:not([data-theme="dark"]) .top-navigation {
        background: rgba(255, 255, 255, 0.66) !important;
        border-color: rgba(17, 18, 15, 0.12) !important;
        box-shadow: 0 10px 32px rgba(17, 18, 15, 0.06) !important;
        backdrop-filter: blur(34px) saturate(1.35) !important;
        -webkit-backdrop-filter: blur(34px) saturate(1.35) !important;
      }

      :root:not([data-theme="dark"]) :is(
      .card,
      .stat-card,
      .folder-card,
      .guide-row,
      .dashboard-class-rail,
      .study-rail-card,
      .canvas-dashboard,
      .compact-calendar,
      .continue-card,
      .recent-material,
      .overview-snapshot,
      .quick-actions button,
      .sn-card-paper,
      .sn-paper,
      .settings-section,
      .flashcard-face,
      .quiz-question-card,
      .practice-source-panel,
      .practice-main,
      .create-card,
      .completion-card,
      .cordia-tutor,
      .tutor-drawer,
      .tutor-dock-panel .cordia-tutor,
      .profile-menu,
      .account-menu-panel,
      .modal,
      .sn-modal,
      .feedback-modal,
      .upgrade-dialog,
      .oauth-callback-card) {
        background: rgba(255, 255, 255, 0.70) !important;
        border-color: rgba(17, 18, 15, 0.14) !important;
        box-shadow: 0 18px 52px rgba(17, 18, 15, 0.10) !important;
        backdrop-filter: blur(30px) saturate(1.25) !important;
        -webkit-backdrop-filter: blur(30px) saturate(1.25) !important;
      }

      .btn,
      .overview-primary,
      .feedback-header-button,
      .upgrade-button,
      .login-cta-btn,
      .create-submit-btn,
      .sn-save-btn,
      .sn-open-btn,
      .cordia-tutor-input button {
        background: #11120f !important;
        color: #ffffff !important;
        border-color: #11120f !important;
      }

      .btn-green,
      .tutor-dock-toggle,
      .tutor-drawer-toggle,
      .calendar-connect-form button {
        background: #394434 !important;
        color: #ffffff !important;
        border-color: #394434 !important;
      }

      :root:not([data-theme="dark"]) :is(
      .btn-outline,
      .btn-gray,
      .overview-secondary,
      .class-add-trigger,
      .account-avatar,
      .account-menu-panel > button,
      .account-theme-row,
      .study-library-tabs,
      .calendar-steps li,
      .class-guide-popover-list > button,
      .class-guide-view-all) {
        background: rgba(255, 255, 255, 0.88) !important;
        color: #11120f !important;
        border: 1px solid rgba(17, 18, 15, 0.14) !important;
      }

      :root:not([data-theme="dark"]) :is(
      .top-navigation-links button.active,
      .study-library-tabs button.active,
      .timer-mode.active,
      .account-theme-row button.active,
      .class-add-trigger,
      .guide-row-type,
      .sn-card-class,
      .extension-banner-badge,
      .calendar-kind,
      .canvas-connected,
      .recent-guide-mark,
      .compact-calendar-mark,
      .calendar-column > header span) {
        background: #ffffff !important;
        color: #11120f !important;
        border: 1px solid rgba(17, 18, 15, 0.14) !important;
        box-shadow: 0 5px 16px rgba(17, 18, 15, 0.07) !important;
      }

      :root:not([data-theme="dark"]) .calendar-steps li::before {
        background: #ffffff !important;
        color: #11120f !important;
        border: 1px solid rgba(17, 18, 15, 0.14) !important;
        box-shadow: 0 5px 16px rgba(17, 18, 15, 0.07) !important;
      }

      .top-navigation-links button:hover,
      .class-add-trigger:hover,
      .btn-outline:hover,
      .btn-gray:hover {
        background: #f7f7f6 !important;
        color: #11120f !important;
      }

      .dashboard-workspace-grid.without-classes .dashboard-center-column {
        padding-left: 74px;
      }

      .overview-snapshot {
        min-height: 86px;
      }

      .overview-stat {
        min-width: 0;
        padding: 20px 24px !important;
      }

      .overview-stat strong,
      .overview-stat span {
        display: block;
      }

      .overview-stat span { margin-top: 5px; }

      /* Dashboard-only white glass workspace. */
      :root:not([data-theme="dark"]) .dashboard-home-shell,
      :root:not([data-theme="dark"]) .dashboard-home-shell .main-content {
        background: #ffffff !important;
        color: #11120f;
      }

      :root:not([data-theme="dark"]) .dashboard-home-shell .top-navigation {
        position: sticky !important;
        top: 0 !important;
        background: rgba(255, 255, 255, 0.76) !important;
        border-bottom: 1px solid rgba(17, 18, 15, 0.14) !important;
        box-shadow: 0 10px 32px rgba(17, 18, 15, 0.08) !important;
        backdrop-filter: blur(42px) saturate(1.2) !important;
        -webkit-backdrop-filter: blur(42px) saturate(1.2) !important;
      }

      :root:not([data-theme="dark"]) .dashboard-home-shell :is(
      .dashboard-class-rail,
      .study-rail-card,
      .continue-card,
      .recent-material,
      .overview-snapshot,
      .quick-actions button,
      .cordia-tutor,
      .class-guide-popover,
      .account-menu-panel) {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.62)) !important;
        border: 1px solid rgba(17, 18, 15, 0.16) !important;
        box-shadow: 0 14px 38px rgba(17, 18, 15, 0.10) !important;
        backdrop-filter: blur(32px) saturate(1.18) !important;
        -webkit-backdrop-filter: blur(32px) saturate(1.18) !important;
      }

      :root:not([data-theme="dark"]) .dashboard-home-shell :is(
      h1, h2, h3, strong, label,
      .overview-eyebrow,
      .streak-number,
      .top-navigation-brand,
      .top-navigation-links button,
      .class-rail-button,
      .learning-profile-card p) {
        color: #11120f !important;
        text-shadow: none !important;
      }

      :root:not([data-theme="dark"]) .dashboard-home-shell :is(
      button,
      input,
      textarea,
      select) {
        text-shadow: none !important;
        transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease, background 120ms ease !important;
      }

      :root:not([data-theme="dark"]) .dashboard-home-shell :is(
      .overview-primary,
      .overview-secondary,
      .feedback-header-button,
      .account-avatar,
      .top-navigation-links button.active,
      .tutor-dock-toggle,
      .class-add-trigger,
      .class-create-form button,
      .class-guide-popover-list > button,
      .class-guide-view-all,
      .timer-btn,
      .timer-mode.active,
      .cordia-tutor-input button) {
        background: rgba(255, 255, 255, 0.90) !important;
        color: #11120f !important;
        border: 1px solid rgba(17, 18, 15, 0.20) !important;
        box-shadow: 0 6px 18px rgba(17, 18, 15, 0.09) !important;
      }

      :root:not([data-theme="dark"]) .dashboard-home-shell :is(
      .overview-primary,
      .overview-secondary,
      .feedback-header-button,
      .tutor-dock-toggle,
      .class-add-trigger,
      .timer-btn,
      .cordia-tutor-input button):hover {
        background: #ffffff !important;
        color: #11120f !important;
        border-color: rgba(17, 18, 15, 0.34) !important;
        box-shadow: 0 9px 24px rgba(17, 18, 15, 0.12) !important;
        transform: translateY(-1px);
      }

      :root:not([data-theme="dark"]) .dashboard-home-shell :is(
      .overview-primary,
      .overview-secondary,
      .feedback-header-button,
      .tutor-dock-toggle,
      .class-add-trigger,
      .timer-btn,
      .cordia-tutor-input button):active {
        transform: scale(0.985);
      }

      :root:not([data-theme="dark"]) .dashboard-home-shell .quick-actions button > span {
        background: rgba(255, 255, 255, 0.90) !important;
        color: #11120f !important;
        border: 1px solid rgba(17, 18, 15, 0.17);
        box-shadow: 0 5px 15px rgba(17, 18, 15, 0.08);
      }

      :root:not([data-theme="dark"]) .dashboard-home-shell :is(input, textarea, select) {
        background: rgba(255, 255, 255, 0.86) !important;
        color: #11120f !important;
        border: 1px solid rgba(17, 18, 15, 0.18) !important;
        box-shadow: 0 5px 16px rgba(17, 18, 15, 0.07) !important;
      }

      .dashboard-home-shell .resizable-edge-panel {
        min-height: 180px;
        max-width: 30vw !important;
      }

      .dashboard-home-shell .resizable-edge-panel[data-height-resized="true"] {
        overflow-y: auto;
      }

      .dashboard-home-shell .edge-resize-handle {
        position: absolute;
        z-index: 120;
        display: block;
        touch-action: none;
        outline: none;
      }

      .dashboard-home-shell .edge-resize-handle::after {
        content: '';
        position: absolute;
        border-radius: 999px;
        background: #11120f;
        opacity: 0;
        transition: opacity 120ms ease;
      }

      .dashboard-home-shell .edge-resize-handle:hover::after,
      .dashboard-home-shell .edge-resize-handle:focus-visible::after { opacity: 0.6; }
      .dashboard-home-shell .edge-resize-handle-left { inset: 12px auto 12px -5px; width: 10px; cursor: ew-resize; }
      .dashboard-home-shell .edge-resize-handle-right { inset: 12px -5px 12px auto; width: 10px; cursor: ew-resize; }
      .dashboard-home-shell .edge-resize-handle-top { inset: -5px 12px auto; height: 10px; cursor: ns-resize; }
      .dashboard-home-shell .edge-resize-handle-bottom { inset: auto 12px -5px; height: 10px; cursor: ns-resize; }
      .dashboard-home-shell .edge-resize-handle-left::after,
      .dashboard-home-shell .edge-resize-handle-right::after { inset: 0 4px; width: 2px; }
      .dashboard-home-shell .edge-resize-handle-top::after,
      .dashboard-home-shell .edge-resize-handle-bottom::after { inset: 4px 0; height: 2px; }

      @media (max-width: 980px) {
        .dashboard-workspace-grid.without-classes .dashboard-center-column { padding-left: 0; }
        .dashboard-home-shell .resizable-edge-panel { width: auto !important; height: auto !important; max-width: none !important; }
        .dashboard-home-shell .edge-resize-handle { display: none; }
      }
    `}</style>
  );
}
