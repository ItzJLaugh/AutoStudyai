import DashboardClassRail from './DashboardClassRail';
import DashboardStudyRail from './DashboardStudyRail';

const noop = () => {};

export default function StudyWorkspaceFrame({
  children,
  classes = [],
  section,
  timerState,
  setTimerState,
  classRail = {},
}) {
  return (
    <div className="dashboard-workspace-grid" data-workspace-section={section}>
      <DashboardClassRail
        classes={classes}
        newFolderName={classRail.newFolderName || ''}
        setNewFolderName={classRail.setNewFolderName || noop}
        showNewFolder={classRail.showNewFolder || false}
        setShowNewFolder={classRail.setShowNewFolder || noop}
        createFolder={classRail.createFolder || noop}
        openFolder={classRail.openFolder || noop}
        openGuide={classRail.openGuide || noop}
        onDragOver={classRail.onDragOver || noop}
        onDragLeave={classRail.onDragLeave || noop}
        onDrop={classRail.onDrop || noop}
        dropTargetId={classRail.dropTargetId || null}
        allowCreate={classRail.allowCreate !== false}
      />
      <section className="dashboard-center-column">{children}</section>
      <DashboardStudyRail timerState={timerState} setTimerState={setTimerState} />
    </div>
  );
}
