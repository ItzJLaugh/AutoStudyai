import DashboardClassRail from './DashboardClassRail';
import DashboardStudyRail from './DashboardStudyRail';
import TutorDrawer from './TutorDrawer';

const noop = () => {};

export default function StudyWorkspaceFrame({
  children,
  classes = [],
  section,
  timerState,
  setTimerState,
  classRail = {},
}) {
  const showClasses = section === 'dashboard' || section === 'guides';

  return (
    <div className={`dashboard-workspace-grid${showClasses ? '' : ' without-classes'}`} data-workspace-section={section}>
      {showClasses && (
        <div className="dashboard-left-stack">
          <TutorDrawer docked />
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
        </div>
      )}
      <section className="dashboard-center-column">{children}</section>
      <DashboardStudyRail timerState={timerState} setTimerState={setTimerState} />
    </div>
  );
}
