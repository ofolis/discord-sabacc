import {
  GameController,
  InteractionController,
  SessionController,
} from "..";
import {
  Command,
} from "../../abstracts";
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
import {
  Log,
} from "../../log";
import type {
  PlayerCard,
  PlayerState,
  SessionState,
} from "../../types";

export class PlayCommand implements Command {
  public readonly description: string = "Play your turn.";

  public readonly isGlobal: boolean = false;

  public readonly isGuild: boolean = true;

  public readonly name: string = "play";

  private static async handleDrawAction(
    currentInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
    session: SessionState,
    player: PlayerState,
  ): Promise<DiscordCommandInteraction | DiscordMessageComponentInteraction> {
    if (player.currentTurnRecord === null || player.currentTurnRecord.action !== TurnAction.DRAW) {
      Log.throw(
        "There is no draw action current turn record.",
        player.currentTurnRecord,
      );
    }
    if (player.currentTurnRecord.drawnCard === null) {
      const drawSourceResponse: [DiscordMessageComponentInteraction, Exclude<PlayerCardSource, PlayerCardSource.DEALT>] | null = await InteractionController.promptChooseDrawSource(
        session,
        player,
        currentInteraction,
      );
      if (drawSourceResponse === null) {
        GameController.setPlayerTurnAction(
          session,
          player,
          null,
        );
        return currentInteraction;
      } else {
        currentInteraction = drawSourceResponse[0];
        GameController.drawPlayerCard(
          session,
          player,
          drawSourceResponse[1],
        );
      }
    }
    if (player.currentTurnRecord.drawnCard === null) {
      Log.throw(
        "Current turn record does not contain a drawn card.",
        player.currentTurnRecord,
      );
    }
    if (player.currentTurnRecord.discardedCard === null) {
      Log.throw(
        "Current turn record already contains a discarded card.",
        player.currentTurnRecord,
      );
    }
    const discardCardResponse: [DiscordButtonInteraction, PlayerCard] | null = await InteractionController.promptChooseDiscardCard(
      session,
      player,
      currentInteraction,
    );
    if (discardCardResponse === null) {
      return currentInteraction;
    } else {
      currentInteraction = discardCardResponse[0];
      GameController.discardPlayerCard(
        session,
        player,
        discardCardResponse[1],
      );
    }
    return currentInteraction;
  }

  private static async handleGameRound(
    currentInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
    session: SessionState,
    player: PlayerState,
  ): Promise<DiscordCommandInteraction | DiscordMessageComponentInteraction> {
    if (player.currentTurnRecord === null) {
      const turnActionResponse: [DiscordButtonInteraction, TurnAction] | null = await InteractionController.promptChooseTurnAction(
        session,
        player,
        currentInteraction,
      );
      if (turnActionResponse === null) {
        return currentInteraction;
      } else {
        currentInteraction = turnActionResponse[0];
        GameController.setPlayerTurnAction(
          session,
          player,
          turnActionResponse[1],
        );
      }
    }
    if (player.currentTurnRecord === null) {
      Log.throw(
        "There is no current turn record.",
        player,
      );
    }
    if (player.currentTurnRecord.action === TurnAction.REVEAL) {
      Log.throw(
        "Reveal action is not valid in game rounds.",
        player.currentTurnRecord,
      );
    }
    if (player.currentTurnRecord.status !== TurnStatus.ACTIVE) {
      // TODO: rewrite/standardize error messages to format "This failed. The reason is this."
      Log.throw(
        "Turn actions can only occur on active turns.",
        player.currentTurnRecord,
      );
    }
    switch (player.currentTurnRecord.action) {
      case TurnAction.DRAW:
        currentInteraction = await this.handleDrawAction(
          currentInteraction,
          session,
          player,
        );
        break;
      case TurnAction.STAND:
        currentInteraction = this.handleStandAction(
          currentInteraction,
          session,
          player,
        );
        break;
      default:
        Log.throw(
          "Unknown turn action.",
          player.currentTurnRecord,
        );
    }
    return currentInteraction;
  }

  private static async handleImposterCard(
    currentInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
    session: SessionState,
    player: PlayerState,
    playerCard: PlayerCard,
  ): Promise<DiscordCommandInteraction | DiscordMessageComponentInteraction> {
    if (playerCard.dieRollValues.length === 0) {
      const rollResponse: DiscordButtonInteraction | null = await InteractionController.promptRollForImposter(
        playerCard,
        currentInteraction,
      );
      if (rollResponse === null) {
        return currentInteraction;
      } else {
        currentInteraction = rollResponse;
        GameController.generatePlayerCardDieRollValues(
          session,
          player,
          playerCard,
        );
      }
    }
    if (playerCard.dieRollValues.length === 0) {
      Log.throw(
        "Imposter die roll values have not been generated.",
        playerCard,
      );
    }
    if (playerCard.dieRollValues.length === 1) {
      Log.throw(
        "Imposter die roll values have already been resolved.",
        playerCard,
      );
    }
    const dieChoiceResponse: [DiscordButtonInteraction, number] | null = await InteractionController.promptChooseImposterDie(
      playerCard,
      currentInteraction,
    );
    if (dieChoiceResponse === null) {
      return currentInteraction;
    } else {
      currentInteraction = dieChoiceResponse[0];
      GameController.setPlayerCardDieRollValue(
        session,
        player,
        playerCard,
        dieChoiceResponse[1],
      );
    }
    return currentInteraction;
  }

  private static async handleScoringRound(
    currentInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
    session: SessionState,
    player: PlayerState,
  ): Promise<DiscordCommandInteraction | DiscordMessageComponentInteraction> {
    if (player.currentBloodCards.length !== 1 || player.currentSandCards.length !== 1) {
      Log.throw(
        "Player does not contain exactly one card of each suit.",
        player,
      );
    }
    const bloodPlayerCard: PlayerCard = player.currentBloodCards[0];
    const sandPlayerCard: PlayerCard = player.currentSandCards[0];
    if (player.currentTurnRecord === null) {
      const revealCardsResponse: DiscordButtonInteraction | null = await InteractionController.promptRevealCards(
        currentInteraction,
      );
      if (revealCardsResponse === null) {
        return currentInteraction;
      } else {
        currentInteraction = revealCardsResponse;
        GameController.setPlayerTurnAction(
          session,
          player,
          TurnAction.REVEAL,
        );
        await GameController.revealCards(
          session,
          player,
        );
      }
    }
    if (player.currentTurnRecord === null) {
      Log.throw(
        "There is no current turn record.",
        player,
      );
    }
    if (player.currentTurnRecord.action !== TurnAction.REVEAL) {
      Log.throw(
        "Only reveal actions are allowed in reveal rounds.",
        player.currentTurnRecord,
      );
    }
    if (player.currentTurnRecord.status !== TurnStatus.ACTIVE) {
      Log.throw(
        "Turn actions can only occur on active turns.",
        player.currentTurnRecord,
      );
    }
    if (bloodPlayerCard.card.type === CardType.IMPOSTER && bloodPlayerCard.dieRollValues.length !== 1) {
      currentInteraction = await this.handleImposterCard(
        currentInteraction,
        session,
        player,
        bloodPlayerCard,
      );
    }
    if ((bloodPlayerCard.card.type !== CardType.IMPOSTER || bloodPlayerCard.dieRollValues.length === 1) && sandPlayerCard.card.type === CardType.IMPOSTER && sandPlayerCard.dieRollValues.length !== 1) {
      currentInteraction = await this.handleImposterCard(
        currentInteraction,
        session,
        player,
        sandPlayerCard,
      );
    }
    if ((bloodPlayerCard.card.type !== CardType.IMPOSTER || bloodPlayerCard.dieRollValues.length === 1) && (sandPlayerCard.card.type !== CardType.IMPOSTER || sandPlayerCard.dieRollValues.length === 1)) {
      GameController.submitCards(
        session,
        player,
      );
    }
    return currentInteraction;
  }

  private static handleStandAction(
    currentInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
    session: SessionState,
    player: PlayerState,
  ): DiscordCommandInteraction | DiscordMessageComponentInteraction {
    if (player.currentTurnRecord === null || player.currentTurnRecord.action !== TurnAction.STAND) {
      Log.throw(
        "There is no stand action current turn record.",
        player,
      );
    }
    GameController.standPlayer(
      session,
      player,
    );
    return currentInteraction;
  }

  public async execute(interaction: DiscordCommandInteraction): Promise<void> {
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
        if (session.players[session.currentPlayerIndex].id === interaction.user.id) {
          let currentInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction = interaction;
          if (session.currentRoundIndex < 3) {
            currentInteraction = await PlayCommand.handleGameRound(
              interaction,
              session,
              player,
            );
          } else {
            currentInteraction = await PlayCommand.handleScoringRound(
              interaction,
              session,
              player,
            );
          }
          if (player.currentTurnRecord !== null && player.currentTurnRecord.status === TurnStatus.COMPLETED) {
            await GameController.endTurn(session);
            await InteractionController.informTurnEnded(currentInteraction);
          }
        } else {
          await InteractionController.informNotTurn(
            session,
            interaction,
          );
        }
      }
    }
  }
}
