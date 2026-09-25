export default function ClassroomVisualSystem() {
  return (
    <style jsx global>{`
      :root {
        --font-sans: Arial, "Helvetica Neue", Helvetica, sans-serif;
      }

      :root:not([data-theme="dark"]) {
        --canvas: #ffffff;
        --surface: rgba(255, 255, 255, 0.62);
        --surface-raised: rgba(255, 255, 255, 0.72);
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

      body { line-height: 1.5; }
      h1, h2, h3 { text-wrap: balance; }
      :root:not([data-theme="dark"]) body,
      :root:not([data-theme="dark"]) .app-shell,
      :root:not([data-theme="dark"]) .main-content {
        background: #ffffff !important;
      }

      :root:not([data-theme="dark"]) body .top-navigation {
        background: rgba(255, 255, 255, 0.58) !important;
        border-color: rgba(17, 18, 15, 0.16) !important;
        box-shadow: 0 1px 0 rgba(255, 255, 255, 0.96) inset, 0 14px 38px rgba(17, 18, 15, 0.10) !important;
        backdrop-filter: blur(42px) saturate(1.4) !important;
        -webkit-backdrop-filter: blur(42px) saturate(1.4) !important;
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
      .plan-card,
      .timer-widget,
      .streak-widget,
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
        background: rgba(255, 255, 255, 0.60) !important;
        border-color: rgba(17, 18, 15, 0.18) !important;
        box-shadow: 0 1px 0 rgba(255, 255, 255, 0.96) inset, 0 22px 60px rgba(17, 18, 15, 0.13) !important;
        backdrop-filter: blur(42px) saturate(1.35) !important;
        -webkit-backdrop-filter: blur(42px) saturate(1.35) !important;
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

      :root:not([data-theme="dark"]) .timer-btn {
        background: #ffffff !important;
        color: #11120f !important;
        border: 1px solid rgba(17, 18, 15, 0.20) !important;
        box-shadow: 0 5px 16px rgba(17, 18, 15, 0.09) !important;
      }

      :root:not([data-theme="dark"]) .timer-btn:hover,
      :root:not([data-theme="dark"]) .timer-btn.active,
      :root:not([data-theme="dark"]) .timer-mode.active {
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
        background: #ffffff !important;
        color: #11120f !important;
        border-color: rgba(17, 18, 15, 0.26) !important;
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

      @media (max-width: 980px) {
        .dashboard-workspace-grid.without-classes .dashboard-center-column { padding-left: 0; }
      }
    `}</style>
  );
}
