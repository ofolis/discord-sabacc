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
  TurnHistoryEntry,
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
          if (player.pendingDiscard !== null) {
            const discardCardResponse: [DiscordButtonInteraction, Card] | undefined = await InteractionController.promptChooseDiscardCard(
              session,
              player,
              interaction,
            );
            if (discardCardResponse !== undefined) {
              const turnHistoryEntry: TurnHistoryEntry = {
                "discardedCard": discardCardResponse[1],
                "drawSource": player.pendingDiscard.drawSource,
                "turnAction": TurnAction.DRAW,
              };
              GameController.playerDiscardCard(
                session,
                discardCardResponse[1],
              );
              GameController.playerEndTurn(
                session,
                turnHistoryEntry,
              );
              await InteractionController.informTurnEnded(discardCardResponse[0]);
              await InteractionController.announceTurnEnded(session);
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
                    GameController.playerDrawCard(
                      session,
                      drawSourceResponse[1],
                    );
                    const discardCardResponse: [DiscordButtonInteraction, Card] | undefined = await InteractionController.promptChooseDiscardCard(
                      session,
                      player,
                      drawSourceResponse[0],
                    );
                    if (discardCardResponse !== undefined) {
                      const turnHistoryEntry: TurnHistoryEntry = {
                        "discardedCard": discardCardResponse[1],
                        "drawSource": drawSourceResponse[1],
                        "turnAction": TurnAction.DRAW,
                      };
                      GameController.playerDiscardCard(
                        session,
                        discardCardResponse[1],
                      );
                      GameController.playerEndTurn(
                        session,
                        turnHistoryEntry,
                      );
                      await InteractionController.informTurnEnded(discardCardResponse[0]);
                      await InteractionController.announceTurnEnded(session);
                    }
                  }
                  break;
                }
                case TurnAction.STAND: {
                  const turnHistoryEntry: TurnHistoryEntry = {
                    "turnAction": TurnAction.STAND,
                  };
                  GameController.playerEndTurn(
                    session,
                    turnHistoryEntry,
                  );
                  await InteractionController.informTurnEnded(turnActionResponse[0]);
                  await InteractionController.announceTurnEnded(session);
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
