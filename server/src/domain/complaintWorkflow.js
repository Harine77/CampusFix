// STRATEGY PATTERN: the current status selects its own allowed-next-status
// strategy. Add or change a workflow path here instead of growing conditionals.
const transitionStrategies = Object.freeze({
  Assigned: (nextStatus) => nextStatus === 'In Progress',
  'In Progress': (nextStatus) => nextStatus === 'Resolved'
});

export function canTransitionStatus(currentStatus, nextStatus) {
  const strategy = transitionStrategies[currentStatus];
  return strategy ? strategy(nextStatus) : false;
}
