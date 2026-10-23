import { config } from '../config/env.js';
import { escalateOverdueComplaints } from '../models/complaintModel.js';

// Polling keeps scheduling infrastructure inside the existing Node service.
// The database update is idempotent, so multiple API instances are safe to run.
export function startEscalationScheduler({
  thresholdDays = config.escalationThresholdDays,
  intervalMs = config.escalationPollIntervalMs
} = {}) {
  let running = false;

  async function sweep() {
    if (running) return;
    running = true;
    try {
      const escalatedCount = await escalateOverdueComplaints(thresholdDays);
      if (escalatedCount > 0) console.info(`CampusFix automatically escalated ${escalatedCount} overdue complaint(s).`);
    } catch (error) {
      // A transient database problem should not terminate the API or future sweeps.
      console.error('CampusFix overdue complaint sweep failed.', error);
    } finally {
      running = false;
    }
  }

  void sweep();
  const timer = setInterval(sweep, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
