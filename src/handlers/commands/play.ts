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
  TurnStatus,
} from "../../enums";
import type {
  Command,
  PlayerCard,
  PlayerState,
  SessionState,
} from "../../types";

// TODO: Find a better way to handle the handler export and it's helpers -- move away from arrow function?

async function handleDrawAction(
  currentInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  session: SessionState,
  player: PlayerState,
): Promise<DiscordCommandInteraction | DiscordMessageComponentInteraction> {
  if (player.currentTurnRecord === null || player.currentTurnRecord.action !== TurnAction.DRAW) {
    throw new Error("There is no draw action current turn record.");
  }
  if (player.currentTurnRecord.drawnCard === null) {
    const drawSourceResponse: [DiscordMessageComponentInteraction, Exclude<PlayerCardSource, PlayerCardSource.DEALT>] | undefined = await InteractionController.promptChooseDrawSource(
      session,
      player,
      currentInteraction,
    );
    if (drawSourceResponse === undefined) {
      return currentInteraction;
    }
    currentInteraction = drawSourceResponse[0];
    GameController.drawPlayerCard(
      session,
      player,
      drawSourceResponse[1],
    );
  }
  if (player.currentTurnRecord.drawnCard === null) {
    throw new Error("Current turn record does not contain a drawn card.");
  }
  if (player.currentTurnRecord.discardedCard !== null) {
    throw new Error("Current turn record already contains a discarded card.");
  }
  const discardCardResponse: [DiscordButtonInteraction, PlayerCard] | undefined = await InteractionController.promptChooseDiscardCard(
    session,
    player,
    currentInteraction,
  );
  if (discardCardResponse === undefined) {
    return currentInteraction;
  }
  currentInteraction = discardCardResponse[0];
  GameController.discardPlayerCard(
    session,
    player,
    discardCardResponse[1],
  );
  return currentInteraction;
}

function handleStandAction(
  currentInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  session: SessionState,
  player: PlayerState,
): DiscordCommandInteraction | DiscordMessageComponentInteraction {
  if (player.currentTurnRecord === null || player.currentTurnRecord.action !== TurnAction.STAND) {
    throw new Error("There is no stand action current turn record.");
  }
  GameController.standPlayer(
    session,
    player,
  );
  return currentInteraction;
}

async function handleGameRound(
  currentInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  session: SessionState,
  player: PlayerState,
): Promise<DiscordCommandInteraction | DiscordMessageComponentInteraction> {
  if (player.currentTurnRecord === null) {
    const turnActionResponse: [DiscordButtonInteraction, TurnAction] | null | undefined = await InteractionController.promptChooseTurnAction(
      session,
      player,
      currentInteraction,
    );
    if (turnActionResponse !== undefined && turnActionResponse !== null) {
      currentInteraction = turnActionResponse[0];
      GameController.setPlayerTurnAction(
        session,
        player,
        turnActionResponse[1],
      );
    } else {
      return currentInteraction;
    }
  }
  if (player.currentTurnRecord === null) {
    throw new Error("No current turn record exists.");
  }
  if (player.currentTurnRecord.status !== TurnStatus.ACTIVE) {
    throw new Error("Current turn record is not active.");
  }
  switch (player.currentTurnRecord.action) {
    case TurnAction.DRAW:
      currentInteraction = await handleDrawAction(
        currentInteraction,
        session,
        player,
      );
      break;
    case TurnAction.STAND:
      currentInteraction = handleStandAction(
        currentInteraction,
        session,
        player,
      );
      break;
    default:
      throw new Error("Unknown turn action.");
  }
  return currentInteraction;
}

async function handleImposterCard(
  currentInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  session: SessionState,
  player: PlayerState,
  playerCard: PlayerCard,
): Promise<DiscordCommandInteraction | DiscordMessageComponentInteraction> {
  if (playerCard.dieRollValues.length === 0) {
    const rollResponse: DiscordButtonInteraction | null | undefined = await InteractionController.promptRollForImposter(
      playerCard,
      currentInteraction,
    );
    if (rollResponse === null || rollResponse === undefined) {
      return currentInteraction;
    }
    if (rollResponse !== undefined && rollResponse !== null) {
      currentInteraction = rollResponse;
      GameController.generatePlayerCardDieRollValues(
        session,
        player,
        playerCard,
      );
    } else {
      return;
    }
  }
  if (playerCard.dieRollValues.length > 1) {
    const dieChoiceResponse: [DiscordButtonInteraction, number] | undefined = await InteractionController.promptChooseImposterDie(
      playerCard,
      currentInteraction,
    );
    if (dieChoiceResponse !== undefined) {
      currentInteraction = dieChoiceResponse[0];
      GameController.setPlayerCardDieRollValue(
        session,
        player,
        playerCard,
        dieChoiceResponse[1],
      );
    } else {
      return;
    }
  }
  return currentInteraction;
}

async function handleScoringRound(
  currentInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  session: SessionState,
  player: PlayerState,
): Promise<DiscordCommandInteraction | DiscordMessageComponentInteraction> {
  if (player.currentBloodCards.length !== 1 || player.currentSandCards.length !== 1) {
    throw new Error("Player does not contain exactly one card of each suit.");
  }
  const bloodPlayerCard: PlayerCard = player.currentBloodCards[0];
  const sandPlayerCard: PlayerCard = player.currentSandCards[0];
  if (bloodPlayerCard.card.type === CardType.IMPOSTER && bloodPlayerCard.dieRollValues.length !== 1) {
    currentInteraction = await handleImposterCard(
      currentInteraction,
      session,
      player,
      bloodPlayerCard,
    );
  }
  if (sandPlayerCard.card.type === CardType.IMPOSTER && sandPlayerCard.dieRollValues.length !== 1) {
    currentInteraction = await handleImposterCard(
      currentInteraction,
      session,
      player,
      sandPlayerCard,
    );
  }
  return currentInteraction;
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
          let currentInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction = interaction;
          if (session.currentRoundIndex < 3) {
            currentInteraction = await handleGameRound(
              interaction,
              session,
              player,
            );
          } else {
            currentInteraction = await handleScoringRound(
              interaction,
              session,
              player,
            );
          }
          if (player.currentTurnRecord !== null && player.currentTurnRecord.status === TurnStatus.COMPLETED) {
            await GameController.endTurn(session);
            await InteractionController.informTurnEnded(currentInteraction);
          }
        }
      }
    }
  },
};
