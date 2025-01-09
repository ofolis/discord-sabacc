import { GameController, InteractionController, SessionController } from "..";
import { Command } from "../../abstracts";
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
import { Log } from "../../log";
import type { PlayerCard, PlayerState, SessionState } from "../../types";

export class PlayCommand implements Command {
  public readonly description = "Play your turn.";

  public readonly isGlobal = false;

  public readonly isGuild = true;

  public readonly name = "play";

  private static async handleDrawAction(
    currentInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
    session: SessionState,
    player: PlayerState,
  ): Promise<DiscordCommandInteraction | DiscordMessageComponentInteraction> {
    if (
      player.currentTurnRecord === null ||
      player.currentTurnRecord.action !== TurnAction.DRAW
    ) {
      Log.throw(
        "Cannot handle draw action. Player turn record is invalid.",
        player.currentTurnRecord,
      );
    }
    if (player.currentTurnRecord.drawnCard === null) {
      const drawSourceResponse:
        | [
            DiscordButtonInteraction,
            Exclude<PlayerCardSource, PlayerCardSource.DEALT>,
          ]
        | null = await InteractionController.promptChooseDrawSource(
        session,
        player,
        currentInteraction,
      );
      if (drawSourceResponse === null) {
        GameController.setPlayerTurnAction(session, player, null);
        return currentInteraction;
      }
      currentInteraction = drawSourceResponse[0];
      GameController.drawPlayerCard(session, player, drawSourceResponse[1]);
    }
    if (player.currentTurnRecord.drawnCard === null) {
      Log.throw(
        "Cannot handle draw action. Player turn record does not contain a drawn card.",
        player.currentTurnRecord,
      );
    }
    if (player.currentTurnRecord.discardedCard !== null) {
      Log.throw(
        "Cannot handle draw action. Player turn record already contains a discarded card.",
        player.currentTurnRecord,
      );
    }
    const discardCardResponse: [DiscordButtonInteraction, PlayerCard] | null =
      await InteractionController.promptChooseDiscardCard(
        session,
        player,
        currentInteraction,
      );
    if (discardCardResponse !== null) {
      currentInteraction = discardCardResponse[0];
      GameController.discardPlayerCard(session, player, discardCardResponse[1]);
    }
    return currentInteraction;
  }

  private static async handleGameRound(
    currentInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
    session: SessionState,
    player: PlayerState,
  ): Promise<DiscordCommandInteraction | DiscordMessageComponentInteraction> {
    if (player.currentTurnRecord === null) {
      const turnActionResponse: [DiscordButtonInteraction, TurnAction] | null =
        await InteractionController.promptChooseTurnAction(
          session,
          player,
          currentInteraction,
        );
      if (turnActionResponse === null) {
        return currentInteraction;
      }
      currentInteraction = turnActionResponse[0];
      GameController.setPlayerTurnAction(
        session,
        player,
        turnActionResponse[1],
      );
    }
    if (
      player.currentTurnRecord === null ||
      player.currentTurnRecord.action === TurnAction.REVEAL ||
      player.currentTurnRecord.status !== TurnStatus.ACTIVE
    ) {
      Log.throw(
        "Cannot handle game round. Player turn record is invalid.",
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
          "Cannot handle game round. Unknown turn action.",
          player.currentTurnRecord,
        );
    }
    return currentInteraction;
  }

  private static async handleImposterCard(
    currentInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
    session: SessionState,
    player: PlayerState,
    playerCard: PlayerCard,
  ): Promise<DiscordCommandInteraction | DiscordMessageComponentInteraction> {
    if (playerCard.dieRollValues.length === 0) {
      const rollResponse: DiscordButtonInteraction | null =
        await InteractionController.promptRollForImposter(
          player,
          playerCard,
          currentInteraction,
        );
      if (rollResponse === null) {
        return currentInteraction;
      }
      currentInteraction = rollResponse;
      GameController.generatePlayerCardDieRollValues(
        session,
        player,
        playerCard,
      );
    }
    if (playerCard.dieRollValues.length !== 2) {
      Log.throw(
        "Cannot handle imposter card. Imposter player card does not contain exactly two die roll values.",
        playerCard,
      );
    }
    const dieChoiceResponse: [DiscordButtonInteraction, number] | null =
      await InteractionController.promptChooseImposterDie(
        player,
        playerCard,
        currentInteraction,
      );
    if (dieChoiceResponse !== null) {
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
    currentInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
    session: SessionState,
    player: PlayerState,
  ): Promise<DiscordCommandInteraction | DiscordMessageComponentInteraction> {
    if (
      player.currentBloodCards.length !== 1 ||
      player.currentSandCards.length !== 1
    ) {
      Log.throw(
        "Cannot handle scoring round. Player does not contain exactly one card of each suit.",
        player,
      );
    }
    const bloodPlayerCard: PlayerCard = player.currentBloodCards[0];
    const sandPlayerCard: PlayerCard = player.currentSandCards[0];
    if (player.currentTurnRecord === null) {
      const revealCardsResponse: DiscordButtonInteraction | null =
        await InteractionController.promptRevealCards(currentInteraction);
      if (revealCardsResponse === null) {
        return currentInteraction;
      }
      currentInteraction = revealCardsResponse;
      GameController.setPlayerTurnAction(session, player, TurnAction.REVEAL);
    }
    if (
      player.currentTurnRecord === null ||
      player.currentTurnRecord.action !== TurnAction.REVEAL ||
      player.currentTurnRecord.status !== TurnStatus.ACTIVE
    ) {
      Log.throw(
        "Cannot handle scoring round. Player turn record is invalid.",
        player.currentTurnRecord,
      );
    }
    if (
      bloodPlayerCard.card.type === CardType.IMPOSTER &&
      bloodPlayerCard.dieRollValues.length !== 1
    ) {
      currentInteraction = await this.handleImposterCard(
        currentInteraction,
        session,
        player,
        bloodPlayerCard,
      );
    }
    if (
      (bloodPlayerCard.card.type !== CardType.IMPOSTER ||
        bloodPlayerCard.dieRollValues.length === 1) &&
      sandPlayerCard.card.type === CardType.IMPOSTER &&
      sandPlayerCard.dieRollValues.length !== 1
    ) {
      currentInteraction = await this.handleImposterCard(
        currentInteraction,
        session,
        player,
        sandPlayerCard,
      );
    }
    if (
      (bloodPlayerCard.card.type !== CardType.IMPOSTER ||
        bloodPlayerCard.dieRollValues.length === 1) &&
      (sandPlayerCard.card.type !== CardType.IMPOSTER ||
        sandPlayerCard.dieRollValues.length === 1)
    ) {
      GameController.finalizePlayerCards(session, player);
    }
    return currentInteraction;
  }

  private static handleStandAction(
    currentInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
    session: SessionState,
    player: PlayerState,
  ): DiscordCommandInteraction | DiscordMessageComponentInteraction {
    if (
      player.currentTurnRecord === null ||
      player.currentTurnRecord.action !== TurnAction.STAND
    ) {
      Log.throw(
        "Cannot handle stand action. Player turn record is invalid.",
        player.currentTurnRecord,
      );
    }
    GameController.standPlayer(session, player);
    return currentInteraction;
  }

  public async execute(interaction: DiscordCommandInteraction): Promise<void> {
    const session: SessionState | null = SessionController.loadSession(
      interaction.channelId,
    );
    if (session === null || session.status !== SessionStatus.ACTIVE) {
      await InteractionController.informNoGame(interaction);
      return;
    }

    const player: PlayerState | null = SessionController.getSessionPlayerById(
      session,
      interaction.user.id,
    );
    if (player === null) {
      await InteractionController.informNotPlaying(interaction);
      return;
    }

    if (
      session.players[session.currentPlayerIndex].id !== interaction.user.id
    ) {
      await InteractionController.informNotTurn(session, interaction);
      return;
    }

    let currentInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction = interaction;
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

    if (
      player.currentTurnRecord !== null &&
      player.currentTurnRecord.status === TurnStatus.COMPLETED
    ) {
      await GameController.endTurn(session);
      await InteractionController.informTurnEnded(currentInteraction);
    }
  }
}
