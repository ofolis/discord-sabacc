import {
  GameController,
  InteractionController,
  SessionController,
} from "..";
import {
  DiscordButtonInteraction,
  DiscordCommandInteraction,
  DiscordMessageComponentInteraction,
} from "../../discord";
import {
  CardType,
  PlayerCardSource,
  SessionStatus,
  TurnAction,
} from "../../enums";
import type {
  Command,
  PlayerCard,
  PlayerState,
  SessionState,
} from "../../types";

// TODO: Find a better way to handle the handler export and it's helpers -- move away from arrow function?

async function handleGameRound(
  interaction: DiscordCommandInteraction,
  session: SessionState,
  player: PlayerState,
): Promise<void> {
  const playerHasPendingDiscard: boolean = player.currentBloodCards.length > 1 || player.currentSandCards.length > 1;
  if (playerHasPendingDiscard) {
    const discardCardResponse: [DiscordButtonInteraction, PlayerCard] | undefined = await InteractionController.promptChooseDiscardCard(
      session,
      player,
      interaction,
    );
    if (discardCardResponse !== undefined) {
      GameController.discardPlayerCard(
        session,
        player,
        discardCardResponse[1],
      );
      await GameController.endTurn(
        session,
      );
      await InteractionController.informTurnEnded(discardCardResponse[0]);
    }
  } else {
    const turnActionResponse: [DiscordButtonInteraction, TurnAction] | null | undefined = await InteractionController.promptChooseTurnAction(
      session,
      player,
      interaction,
    );
    if (turnActionResponse !== undefined && turnActionResponse !== null) {
      switch (turnActionResponse[1]) {
        case TurnAction.DRAW: {
          const drawSourceResponse: [DiscordMessageComponentInteraction, Exclude<PlayerCardSource, PlayerCardSource.DEALT>] | null | undefined = await InteractionController.promptChooseDrawSource(
            session,
            player,
            turnActionResponse[0],
          );
          if (drawSourceResponse !== undefined) {
            GameController.drawPlayerCard(
              session,
              player,
              drawSourceResponse[1],
            );
            const discardCardResponse: [DiscordButtonInteraction, PlayerCard] | undefined = await InteractionController.promptChooseDiscardCard(
              session,
              player,
              drawSourceResponse[0],
            );
            if (discardCardResponse !== undefined) {
              GameController.discardPlayerCard(
                session,
                player,
                discardCardResponse[1],
              );
              await GameController.endTurn(
                session,
              );
              await InteractionController.informTurnEnded(discardCardResponse[0]);
            }
          }
          break;
        }
        case TurnAction.STAND: {
          GameController.standPlayer(
            session,
            player,
          );
          await GameController.endTurn(session);
          await InteractionController.informTurnEnded(turnActionResponse[0]);
          break;
        }
        default:
          throw new Error("Unknown turn action.");
      }
    }
  }
}

async function handleScoringRound(
  interaction: DiscordCommandInteraction,
  session: SessionState,
  player: PlayerState,
): Promise<void> {
  // TODO: write scoring turn logic
  if (player.currentBloodCards[0].card.type === CardType.IMPOSTER) {
    if (player.currentBloodCards[0].dieRollValues.length === 0) {
      // Roll
    }
    if (player.currentBloodCards[0].dieRollValues.length > 1) {
      // Choose
    }
  }
  if (player.currentBloodCards[1].card.type === CardType.IMPOSTER) {
    if (player.currentBloodCards[1].dieRollValues.length === 0) {
      // Roll
    }
    if (player.currentBloodCards[1].dieRollValues.length > 1) {
      // Choose
    }
  }
}

export const command: Command = {
  "name": "play",
  "description": "Play your turn.",
  "isGlobal": false,
  "isGuild": true,
  "execute": async(interaction: DiscordCommandInteraction): Promise<void> => {
    const session: SessionState | null = SessionController.loadSession(interaction.channelId);
    if (session === null || session.status !== SessionStatus.ACTIVE) {
      await InteractionController.informNoGame(interaction);
    } else {
      const player: PlayerState | null = SessionController.getSessionPlayerById(
        session,
        interaction.user.id,
      );
      if (player === null) {
        await InteractionController.informNotPlaying(interaction);
      } else {
        if (session.players[session.currentPlayerIndex].id !== interaction.user.id) {
          await InteractionController.informNotTurn(
            session,
            interaction,
          );
        } else {
          if (session.currentRoundIndex < 3) {
            await handleGameRound(
              interaction,
              session,
              player,
            );
          } else {
            await handleScoringRound(
              interaction,
              session,
              player,
            );
          }
        }
      }
    }
  },
};
