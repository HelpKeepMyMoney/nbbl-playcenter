import type { AuthContext } from "./context";
import {
  handleCreateParticipant,
  handleSoftDeleteParticipant,
  handleUpdateParticipant,
} from "./commands/participants";
import {
  handleAddTeamMember,
  handleAssignCoach,
  handleCreateTeam,
  handleRemoveTeamMember,
  handleUpdateTeam,
} from "./commands/teams";
import {
  handleAssignPlayerMembership,
  handleCancelPlayerMembership,
  handleChangePlayerMembershipPlan,
  handleCreateMembershipPlan,
  handlePausePlayerMembership,
  handleResumePlayerMembership,
  handleToggleMembershipAutoRenew,
  handleUpdateMembershipPlan,
} from "./commands/memberships";
import {
  handleCreateTournamentDraft,
  handleDeleteTournament,
  handleRecalculateTournamentSchedule,
  handleRecordMatchResult,
  handleSaveTournament,
  handleSimulateTournament,
  handleUpdateTournament,
} from "./commands/tournaments";
import { handleUpdateFanFavorites } from "./commands/users";

export type CommandHandler = (
  ctx: AuthContext,
  data: unknown
) => Promise<unknown>;

export const commandRegistry: Record<string, CommandHandler> = {
  createParticipant: handleCreateParticipant,
  updateParticipant: handleUpdateParticipant,
  softDeleteParticipant: handleSoftDeleteParticipant,
  createTeam: handleCreateTeam,
  updateTeam: handleUpdateTeam,
  assignCoach: handleAssignCoach,
  addTeamMember: handleAddTeamMember,
  removeTeamMember: handleRemoveTeamMember,
  createTournamentDraft: handleCreateTournamentDraft,
  saveTournament: handleSaveTournament,
  recalculateTournamentSchedule: handleRecalculateTournamentSchedule,
  updateTournament: handleUpdateTournament,
  deleteTournament: handleDeleteTournament,
  recordMatchResult: handleRecordMatchResult,
  simulateTournament: handleSimulateTournament,
  createMembershipPlan: handleCreateMembershipPlan,
  updateMembershipPlan: handleUpdateMembershipPlan,
  assignPlayerMembership: handleAssignPlayerMembership,
  changePlayerMembershipPlan: handleChangePlayerMembershipPlan,
  pausePlayerMembership: handlePausePlayerMembership,
  resumePlayerMembership: handleResumePlayerMembership,
  cancelPlayerMembership: handleCancelPlayerMembership,
  toggleMembershipAutoRenew: handleToggleMembershipAutoRenew,
  updateFanFavorites: handleUpdateFanFavorites,
};

export async function runCommand(
  command: string,
  ctx: AuthContext,
  data: unknown
): Promise<unknown> {
  const handler = commandRegistry[command];
  if (!handler) {
    throw new Error(`Unknown command: ${command}`);
  }
  return handler(ctx, data);
}
