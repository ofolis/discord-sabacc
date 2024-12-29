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
  DrawSource,
  SessionStatus,
  TurnAction,
} from "../../enums";
import type {
  Card,
  Command,
  PlayerState,
  SessionState,
} from "../../types";

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
          if (GameController.playerHasPendingDiscard(player)) {
            const discardCardResponse: [DiscordButtonInteraction, Card] | undefined = await InteractionController.promptChooseDiscardCard(
              session,
              player,
              interaction,
            );
            if (discardCardResponse !== undefined) {
              GameController.playerDiscardCard(
                session,
                player,
                discardCardResponse[1],
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
                  const drawSourceResponse: [DiscordMessageComponentInteraction, DrawSource] | null | undefined = await InteractionController.promptChooseDrawSource(
                    session,
                    player,
                    turnActionResponse[0],
                  );
                  if (drawSourceResponse !== undefined) {
                    GameController.playerSpendToken(
                      session,
                      player,
                    );
                    GameController.playerDrawCard(
                      session,
                      player,
                      drawSourceResponse[1],
                    );
                    const discardCardResponse: [DiscordButtonInteraction, Card] | undefined = await InteractionController.promptChooseDiscardCard(
                      session,
                      player,
                      drawSourceResponse[0],
                    );
                    if (discardCardResponse !== undefined) {
                      GameController.playerDiscardCard(
                        session,
                        player,
                        discardCardResponse[1],
                      );
                      GameController.endTurn(session);
                      await InteractionController.informTurnEnded(discardCardResponse[0]);
                      // TODO: Move all this into an "end turn" logic area that resolves correctly for every code path in this file.
                      if (session.status === SessionStatus.COMPLETED) {
                        await InteractionController.announceGameResult(session);
                      } else {
                        if (session.currentRoundIndex === 0) {
                          await InteractionController.announceHandStarted(session);
                        } else if (session.currentPlayerIndex === 0) {
                          await InteractionController.announceRoundStarted(session);
                        }
                        await InteractionController.announceTurnStarted(session);
                      }
                    }
                  }
                  break;
                }
                case TurnAction.STAND: {
                  await InteractionController.informTurnEnded(turnActionResponse[0]);
                  break;
                }
                default:
                  throw new Error("Unknown turn action.");
              }
            }
          }
        }
      }
    }
  },
};
