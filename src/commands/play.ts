import {
  DataController,
  GameController,
  InteractionController,
} from "../controllers";
import { Command, Log } from "../core";
import {
  DiscordButtonInteraction,
  DiscordCommandInteraction,
  DiscordMessageComponentInteraction,
} from "../core/discord";
import {
  CardSuit,
  CardType,
  PlayerCardSource,
  SessionStatus,
  TurnAction,
  TurnStatus,
} from "../enums";
import { ChannelState, Player, Session, Turn } from "../saveables";
import type { PlayerCard } from "../types";

export class Play implements Command {
  public readonly description = "Play your turn.";

  public readonly isGlobal = false;

  public readonly isGuild = true;

  public readonly name = "play";

  private static async handleDrawAction(
    currentInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
    session: Session,
    player: Player,
  ): Promise<DiscordCommandInteraction | DiscordMessageComponentInteraction> {
    if (player.currentTurnAction !== TurnAction.DRAW) {
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
        player.setTurnAction(null);
        return currentInteraction;
      }
      currentInteraction = drawSourceResponse[0];
      session.drawPlayerCard(player, drawSourceResponse[1]);
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

  //TODO: START HERE! Keep going in this direcion -- note the pattern change here in handleGameRound, that should be used elsewhere (if we keep liking it)
  private static async handleGameRound(
    currentInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
    session: Session,
    player: Player,
  ): Promise<DiscordCommandInteraction | DiscordMessageComponentInteraction> {
    let playerCurrentTurn: Turn | null = player.currentTurn;
    if (playerCurrentTurn === null) {
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
      playerCurrentTurn = player.initializeCurrentTurn(turnActionResponse[1]);
    }
    // TODO: remove this after adding dependency injection
    if (playerCurrentTurn.status !== TurnStatus.ACTIVE) {
      Log.throw(
        "Cannot handle game round. Player turn is not active.",
        playerCurrentTurn,
      );
    }
    switch (playerCurrentTurn.action) {
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
          playerCurrentTurn,
        );
    }
    return currentInteraction;
  }

  private static async handleImposterCard(
    currentInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
    session: Session,
    player: Player,
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
    session: Session,
    player: Player,
  ): Promise<DiscordCommandInteraction | DiscordMessageComponentInteraction> {
    const bloodPlayerCards: PlayerCard[] = player.getCards(CardSuit.BLOOD);
    const sandPlayerCards: PlayerCard[] = player.getCards(CardSuit.SAND);
    if (bloodPlayerCards.length !== 1 || sandPlayerCards.length !== 1) {
      Log.throw(
        "Cannot handle scoring round. Player does not contain exactly one card of each suit.",
        player,
      );
    }
    const bloodPlayerCard: PlayerCard = bloodPlayerCards[0];
    const sandPlayerCard: PlayerCard = sandPlayerCards[0];
    let playerCurrentTurn: Turn | null = player.currentTurn;
    if (playerCurrentTurn === null) {
      playerCurrentTurn = player.initializeCurrentTurn(TurnAction.REVEAL);
    }
    // TODO: remove this after implementing dependency injection
    if (playerCurrentTurn.status !== TurnStatus.ACTIVE) {
      Log.throw(
        "Cannot handle scoring round. Player turn is not active.",
        playerCurrentTurn,
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
      const revealCardsResponse: DiscordButtonInteraction | null =
        await InteractionController.promptRevealCards(
          player,
          currentInteraction,
        );
      if (revealCardsResponse === null) {
        return currentInteraction;
      }
      currentInteraction = revealCardsResponse;
      GameController.finalizePlayerCards(session, player);
    }
    return currentInteraction;
  }

  private static handleStandAction(
    currentInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
    session: Session,
    player: Player,
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
    const channelState: ChannelState | null = DataController.loadChannelState(
      interaction.channelId,
    );
    if (
      channelState === null ||
      channelState.session.status !== SessionStatus.ACTIVE
    ) {
      await InteractionController.informNoGame(interaction);
      return;
    }

    const player: Player | null = channelState.session.getPlayerById(
      interaction.user.id,
    );
    if (player === null) {
      await InteractionController.informNotPlaying(interaction);
      return;
    }

    if (channelState.session.currentPlayer.id !== interaction.user.id) {
      await InteractionController.informNotTurn(
        channelState.session,
        interaction,
      );
      return;
    }

    let currentInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction = interaction;
    if (channelState.session.currentRoundIndex < 3) {
      currentInteraction = await Play.handleGameRound(
        interaction,
        channelState.session,
        player,
      );
    } else {
      currentInteraction = await Play.handleScoringRound(
        interaction,
        channelState.session,
        player,
      );
    }

    if (
      player.currentTurn !== null &&
      player.currentTurn.status === TurnStatus.COMPLETED
    ) {
      await session.endTurn();
      await InteractionController.informTurnEnded(currentInteraction);
    }

    DataController.saveChannelState(channelState);
  }
}
