import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export {
  createParticipant,
  updateParticipant,
  softDeleteParticipant,
} from "./participants/commands";
export {
  createTeam,
  updateTeam,
  assignCoach,
  addTeamMember,
  removeTeamMember,
} from "./teams/commands";
export {
  createTournamentDraft,
  saveTournament,
  recalculateTournamentSchedule,
  updateTournament,
  deleteTournament,
  recordMatchResult,
  simulateTournament,
} from "./tournaments/commands";
export {
  createMembershipPlan,
  updateMembershipPlan,
  assignPlayerMembership,
  changePlayerMembershipPlan,
  pausePlayerMembership,
  resumePlayerMembership,
  cancelPlayerMembership,
  toggleMembershipAutoRenew,
} from "./memberships/commands";
export { updateFanFavorites } from "./users/commands";
export { onUserCreate } from "./security/onUserCreate";
