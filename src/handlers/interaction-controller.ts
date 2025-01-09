import {
  Discord,
  DiscordButtonBuilder,
  DiscordButtonInteraction,
  DiscordButtonStyle,
  DiscordCommandInteraction,
  DiscordInteractionResponse,
  DiscordMessage,
  DiscordMessageComponentInteraction,
  DiscordUser,
} from "../discord";
import { CardSuit, CardType, PlayerCardSource, TurnAction } from "../enums";
import { Log } from "../log";
import {
  Card,
  HandResult,
  PlayerCard,
  PlayerState,
  SessionState,
} from "../types";
import { Utils } from "../utils";

export class InteractionController {
  private static formatCardSuitIcon(cardSuit: CardSuit): string {
    switch (cardSuit) {
      case CardSuit.BLOOD:
        return "🟥";
      case CardSuit.SAND:
        return "🟨";
      default:
        Log.throw("Cannot format card suit icon. Unknown card suit.", cardSuit);
    }
  }

  private static formatCardString(card: Card | PlayerCard): string {
    let playerCard: PlayerCard | null = null;
    if ("card" in card) {
      playerCard = card;
      card = card.card;
    }
    const suitIcon: string = this.formatCardSuitIcon(card.suit);
    let typeLabel: string;
    switch (card.type) {
      case CardType.IMPOSTER:
        typeLabel = "Imposter";
        break;
      case CardType.NUMBER:
        typeLabel = card.value.toString();
        break;
      case CardType.SYLOP:
        typeLabel = "Sylop";
        break;
      default:
        Log.throw("Cannot format card string. Unknown card type.", card);
    }
    if (
      playerCard !== null &&
      card.type === CardType.IMPOSTER &&
      playerCard.dieRollValues.length === 1
    ) {
      typeLabel = `${playerCard.dieRollValues[0].toString()} (${typeLabel})`;
    }
    return `${suitIcon}${typeLabel}`;
  }

  private static formatChannelTagString(): string {
    return "@everyone";
  }

  private static formatHandRoundMessage(session: SessionState): string {
    return `**Hand:** \`${(session.currentHandIndex + 1).toString()}\`  |  **Round:** \`${session.currentRoundIndex < 3 ? `${(session.currentRoundIndex + 1).toString()}/3` : "REVEAL"}\``;
  }

  private static formatPlayerItemsMessage(player: PlayerState): string {
    const bloodCardsString: string =
      player.currentBloodCards.length > 0
        ? player.currentBloodCards
            .map(
              (playerCard) => `\`${this.formatCardString(playerCard.card)}\``,
            )
            .join(" ")
        : "`None`";
    const sandCardsString: string =
      player.currentSandCards.length > 0
        ? player.currentSandCards
            .map(
              (playerCard) => `\`${this.formatCardString(playerCard.card)}\``,
            )
            .join(" ")
        : "`None`";
    const contentLines: string[] = [
      `Sand: ${sandCardsString}`,
      `Blood: ${bloodCardsString}`,
      `Tokens: \`${this.formatPlayerTokenString(player)}\``,
    ];
    return Utils.linesToString(contentLines);
  }

  private static formatPlayerListMessage(session: SessionState): string {
    const contentLines: string[] = [];
    session.players.forEach((player, index) =>
      contentLines.push(
        `- **${this.formatPlayerNameString(player)}**${index === session.currentPlayerIndex ? " 👤" : ""}`,
        `  - Tokens: \`${this.formatPlayerTokenString(player)}\``,
      ),
    );
    return Utils.linesToString(contentLines);
  }

  private static formatPlayerNameString(
    player: PlayerState | DiscordUser,
  ): string {
    return (player.globalName ?? player.username).toUpperCase();
  }

  private static formatPlayerTagString(
    player: PlayerState | DiscordUser,
  ): string {
    return `<@${player.id}>`;
  }

  private static formatPlayerTokenString(player: PlayerState): string {
    const tokenString: string =
      "⚪".repeat(player.currentTokenTotal - player.currentSpentTokenTotal) +
      "⚫".repeat(player.currentSpentTokenTotal);
    return tokenString.length === 0 ? "None" : tokenString;
  }

  private static formatHandResultMessage(handResult: HandResult): string {
    if (handResult.cardDifference > 0) {
      return "";
    }
    switch (handResult.lowestCardValue) {
      case 0:
        return "Sylop Sabacc!";
      case 1:
        return "Prime Sabacc!";
      default:
        return "Sabacc!";
    }
  }

  private static formatTableDiscardMessage(session: SessionState): string {
    const bloodDiscardString: string =
      session.bloodDiscard.length > 0
        ? `\`${this.formatCardString(session.bloodDiscard[0])}\``
        : "`None`";
    const sandDiscardString: string =
      session.sandDiscard.length > 0
        ? `\`${this.formatCardString(session.sandDiscard[0])}\``
        : "`None`";
    const contentLines: string[] = [
      `Sand: ${sandDiscardString}`,
      `Blood: ${bloodDiscardString}`,
    ];
    return Utils.linesToString(contentLines);
  }

  private static async handleButtonInteraction(
    interactionResponse: DiscordInteractionResponse | DiscordMessage,
    discordInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction
      | null,
    timeoutMessage: string,
    timeoutDelay: number = 60000,
  ): Promise<DiscordButtonInteraction | null> {
    const buttonInteraction: DiscordButtonInteraction | null =
      await Discord.getButtonInteraction(
        interactionResponse,
        discordInteraction !== null
          ? (i): boolean => i.user.id === discordInteraction.user.id
          : null,
        timeoutDelay,
      );
    if (buttonInteraction === null) {
      await Discord.updateSentItem(interactionResponse, timeoutMessage, {});
    }
    return buttonInteraction;
  }

  public static async announceGameEnded(session: SessionState): Promise<void> {
    const activePlayers: PlayerState[] = session.players.filter(
      (player) => !player.isEliminated,
    );
    if (activePlayers.length !== 1) {
      Log.throw(
        "Cannot announce game ended. There is more than one remaining player.",
        session.players,
      );
    }
    const contentLines: string[] = [
      "# Ended Game",
      `After ${(session.currentHandIndex + 1).toString()} hand${session.currentHandIndex === 0 ? "" : "s"}, the game is over!`,
      `## ${this.formatPlayerNameString(activePlayers[0])} (${this.formatPlayerTagString(activePlayers[0])}) wins! 🎉`,
    ];
    await Discord.sendMessage(
      session.channelId,
      Utils.linesToString(contentLines),
    );
  }

  public static async announceGameStarted(
    session: SessionState,
  ): Promise<void> {
    await Discord.sendMessage(session.channelId, "# Starting Game");
  }

  public static async announceHandEnded(session: SessionState): Promise<void> {
    if (session.handResults.length < session.currentHandIndex + 1) {
      Log.throw(
        "Cannot announce hand ended. Results do not exist for the current hand.",
        session,
      );
    }
    const contentLines: string[] = [
      `# Ended Hand ${(session.currentHandIndex + 1).toString()}`,
      "Here are the results...",
    ];
    const usedPlayerIndexes: number[] = [];
    for (const handResult of session.handResults[session.currentHandIndex]) {
      const player: PlayerState = session.players[handResult.playerIndex];
      const tokenDetailStrings: string[] = [];
      if (handResult.tokenLossTotal === 0) {
        tokenDetailStrings.push("`FULL REFUND`");
      } else {
        if (handResult.spentTokenTotal > 0) {
          tokenDetailStrings.push(
            `\`${handResult.spentTokenTotal.toString()} SPENT\``,
          );
        }
        if (handResult.tokenPenaltyTotal > 0) {
          tokenDetailStrings.push(
            `\`${handResult.tokenPenaltyTotal.toString()} PENALTY\``,
          );
        }
      }
      const handResultMessage: string =
        this.formatHandResultMessage(handResult);
      contentLines.push(
        `- \`#${(handResult.rankIndex + 1).toString()}\` ${player.isEliminated ? `~~**${this.formatPlayerNameString(player)}**~~ 💀` : `**${this.formatPlayerNameString(player)}**`}`,
        `  - Cards: \`${this.formatCardString(handResult.sandCard)}\` \`${this.formatCardString(handResult.bloodCard)}\`${handResultMessage.length > 0 ? ` _${handResultMessage}_` : ""}`,
        `  - Tokens: \`${"⚪".repeat(player.currentTokenTotal)}${"🔴".repeat(handResult.tokenLossTotal)}\` (${tokenDetailStrings.join("+")})`,
      );
      usedPlayerIndexes.push(handResult.playerIndex);
    }
    session.players.forEach((player, playerIndex) => {
      if (!usedPlayerIndexes.includes(playerIndex)) {
        contentLines.push(`~~${this.formatPlayerNameString(player)}~~ 💀`);
      }
    });
    await Discord.sendMessage(
      session.channelId,
      Utils.linesToString(contentLines),
    );
  }

  public static async announceHandStarted(
    session: SessionState,
  ): Promise<void> {
    const contentLines: string[] = [
      `# Starting Hand ${(session.currentHandIndex + 1).toString()}`,
      "New cards will be dealt and tokens will be refreshed.",
    ];
    await Discord.sendMessage(
      session.channelId,
      Utils.linesToString(contentLines),
    );
  }

  public static async announceRoundStarted(
    session: SessionState,
  ): Promise<void> {
    const contentLines: string[] = [
      session.currentRoundIndex < 3
        ? `## Starting Round ${(session.currentRoundIndex + 1).toString()}`
        : "## Starting Reveal Round",
      this.formatHandRoundMessage(session),
    ];
    await Discord.sendMessage(
      session.channelId,
      Utils.linesToString(contentLines),
    );
  }

  public static async announceTurnEnded(session: SessionState): Promise<void> {
    const player: PlayerState =
      session.players[
        (session.currentPlayerIndex === 0
          ? session.players.length
          : session.currentPlayerIndex) - 1
      ];
    if (player.currentTurnRecord === null) {
      Log.throw(
        "Cannot announce turn ended. Player did not contain a turn record.",
        player,
      );
    }
    const contentLines: string[] = [];
    switch (player.currentTurnRecord.action) {
      case TurnAction.DRAW:
        if (
          player.currentTurnRecord.drawnCard === null ||
          player.currentTurnRecord.discardedCard === null
        ) {
          Log.throw(
            "Cannot announce turn ended. Player turn record did not contain both a drawn and discarded card.",
            player.currentTurnRecord,
          );
        }
        contentLines.push(
          `## ${this.formatPlayerNameString(player)} Drew A Card`,
        );
        if (
          [PlayerCardSource.BLOOD_DECK, PlayerCardSource.SAND_DECK].includes(
            player.currentTurnRecord.drawnCard.source,
          )
        ) {
          contentLines.push(
            `A card was drawn from the \`${this.formatCardSuitIcon(player.currentTurnRecord.drawnCard.card.suit)}\` deck and \`${this.formatCardString(player.currentTurnRecord.discardedCard.card)}\` was discarded.`,
          );
        } else {
          contentLines.push(
            `\`${this.formatCardString(player.currentTurnRecord.drawnCard.card)}\` was drawn from the \`${this.formatCardSuitIcon(player.currentTurnRecord.drawnCard.card.suit)}\` discard and \`${this.formatCardString(player.currentTurnRecord.discardedCard.card)}\` was discarded.`,
          );
        }
        contentLines.push(
          "### Discard",
          this.formatTableDiscardMessage(session),
        );
        break;
      case TurnAction.REVEAL:
        contentLines.push(
          `## ${this.formatPlayerNameString(player)} Completed Their Hand`,
          "Here's their final cards...",
          `# \`${this.formatCardString(player.currentSandCards[0])}\` \`${this.formatCardString(player.currentBloodCards[0])}\``,
        );
        break;
      case TurnAction.STAND:
        contentLines.push(
          `## ${this.formatPlayerNameString(player)} Stood`,
          "No card was drawn or discarded.",
          "### Discard",
          this.formatTableDiscardMessage(session),
        );
        break;
      default:
        Log.throw(
          "Cannot announce turn ended. Unknown turn action.",
          player.currentTurnRecord,
        );
    }
    await Discord.sendMessage(
      session.channelId,
      Utils.linesToString(contentLines),
    );
  }

  public static async announceTurnStarted(
    session: SessionState,
  ): Promise<void> {
    const contentLines: string[] = [
      `## ${this.formatPlayerNameString(session.players[session.currentPlayerIndex])}'s Turn`,
      `${this.formatPlayerTagString(session.players[session.currentPlayerIndex])} use the **/play** command to take your turn.`,
      "### Players",
      this.formatPlayerListMessage(session),
    ];
    await Discord.sendMessage(
      session.channelId,
      Utils.linesToString(contentLines),
    );
  }

  public static async cancelInteraction(
    discordResponse: DiscordMessage | DiscordInteractionResponse,
  ): Promise<void> {
    await Discord.deleteSentItem(discordResponse);
  }

  public static async informNoGame(
    discordInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
  ): Promise<void> {
    const contentLines: string[] = [
      "### No Game",
      "There is no game currently active in this channel.",
      "-# Use the **/new** command to start a new game.",
    ];
    await Discord.sendPersistentInteractionResponse(
      discordInteraction,
      Utils.linesToString(contentLines),
      true,
      {},
    );
  }

  public static async informNotPlaying(
    discordInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
  ): Promise<void> {
    const contentLines: string[] = [
      "### Not Playing",
      "You are not part of the current game.",
    ];
    await Discord.sendPersistentInteractionResponse(
      discordInteraction,
      Utils.linesToString(contentLines),
      true,
      {},
    );
  }

  public static async informNotTurn(
    session: SessionState,
    discordInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
  ): Promise<void> {
    const currentPlayer: PlayerState =
      session.players[session.currentPlayerIndex];
    const contentLines: string[] = [
      "### Not Your Turn",
      `It is currently ${this.formatPlayerNameString(currentPlayer)}'s turn.`,
      "-# Use the **/info** command to view your hand and see game info.",
    ];
    await Discord.sendPersistentInteractionResponse(
      discordInteraction,
      Utils.linesToString(contentLines),
      true,
      {},
    );
  }

  public static async informPlayerInfo(
    session: SessionState,
    player: PlayerState,
    discordInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
  ): Promise<void> {
    const isPlayerTurn: boolean =
      session.players[session.currentPlayerIndex].id ===
      discordInteraction.user.id;
    const contentLines: string[] = [
      isPlayerTurn
        ? "## Your Turn"
        : `## ${this.formatPlayerNameString(session.players[session.currentPlayerIndex])}'s Turn`,
      this.formatHandRoundMessage(session),
      "### Discard",
      this.formatTableDiscardMessage(session),
      "### Players",
      this.formatPlayerListMessage(session),
      "### Your Items",
      this.formatPlayerItemsMessage(player),
    ];
    if (isPlayerTurn) {
      contentLines.push("-# Use the **/play** command to take your turn.");
    }
    await Discord.sendPersistentInteractionResponse(
      discordInteraction,
      Utils.linesToString(contentLines),
      true,
      {},
    );
  }

  public static async informStartingGame(
    discordInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
  ): Promise<void> {
    await Discord.sendPersistentInteractionResponse(
      discordInteraction,
      "**Starting a new game...**",
      true,
      {},
    );
  }

  public static async informTurnEnded(
    discordInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
  ): Promise<void> {
    await Discord.sendPersistentInteractionResponse(
      discordInteraction,
      "_Your turn is complete._",
      true,
      {},
    );
  }

  public static async promptChooseDiscardCard(
    session: SessionState,
    player: PlayerState,
    discordInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
  ): Promise<[DiscordButtonInteraction, PlayerCard] | null> {
    const buttonMap: Record<string, DiscordButtonBuilder> = {};
    const contentLines: string[] = [
      this.formatHandRoundMessage(session),
      "### Discard",
      this.formatTableDiscardMessage(session),
      "### Your Items",
      this.formatPlayerItemsMessage(player),
      "",
      "**Choose a card to discard.**",
    ];
    const playerCardSet: PlayerCard[] | null =
      player.currentBloodCards.length > 1
        ? player.currentBloodCards
        : player.currentSandCards.length > 1
          ? player.currentSandCards
          : null;
    if (playerCardSet === null) {
      Log.throw(
        "Cannot prompt choose discard card. Player does not require a discard.",
        player,
      );
    }
    const discardMap: Record<string, PlayerCard> = {};
    playerCardSet.forEach((playerCard, index) => {
      const key: string = `discardOption${index.toString()}`;
      discardMap[key] = playerCard;
      buttonMap[key] = new DiscordButtonBuilder()
        .setLabel(this.formatCardString(playerCard.card))
        .setStyle(DiscordButtonStyle.Primary);
    });
    const interactionResponse: DiscordInteractionResponse =
      await Discord.sendPersistentInteractionResponse(
        discordInteraction,
        Utils.linesToString(contentLines),
        true,
        buttonMap,
      );
    const buttonInteraction: DiscordButtonInteraction | null =
      await Discord.getButtonInteraction(
        interactionResponse,
        (i) => i.user.id === discordInteraction.user.id,
      );
    if (buttonInteraction === null) {
      await Discord.updateSentItem(
        interactionResponse,
        "_Discard action timed out._",
        {},
      );
      return null;
    }
    if (!(buttonInteraction.customId in discardMap)) {
      Log.throw(
        "Cannot prompt choose discard card. Unknown button interaction response ID.",
        buttonInteraction.customId,
        discardMap,
      );
    }
    return [buttonInteraction, discardMap[buttonInteraction.customId]];
  }

  public static async promptChooseDrawSource(
    session: SessionState,
    player: PlayerState,
    discordInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
  ): Promise<
    | [
        DiscordButtonInteraction,
        Exclude<PlayerCardSource, PlayerCardSource.DEALT>,
      ]
    | null
  > {
    const buttonMap: Record<string, DiscordButtonBuilder> = {};
    const contentLines: string[] = [
      this.formatHandRoundMessage(session),
      "### Discard",
      this.formatTableDiscardMessage(session),
      "### Your Items",
      this.formatPlayerItemsMessage(player),
      "",
      "**Choose a draw option.**",
    ];
    if (session.sandDiscard.length > 0) {
      buttonMap.sandDiscard = new DiscordButtonBuilder()
        .setLabel(this.formatCardString(session.sandDiscard[0]))
        .setStyle(DiscordButtonStyle.Primary);
    } else {
      contentLines.push("-# There is currently no sand discard to draw.");
    }
    if (session.bloodDiscard.length > 0) {
      buttonMap.bloodDiscard = new DiscordButtonBuilder()
        .setLabel(this.formatCardString(session.bloodDiscard[0]))
        .setStyle(DiscordButtonStyle.Primary);
    } else {
      contentLines.push("-# There is currently no blood discard to draw.");
    }
    if (session.sandDeck.length > 0) {
      buttonMap.sandDeck = new DiscordButtonBuilder()
        .setLabel("🟨?")
        .setStyle(DiscordButtonStyle.Primary);
    } else {
      contentLines.push("-# There is currently no sand deck to draw.");
    }
    if (session.bloodDeck.length > 0) {
      buttonMap.bloodDeck = new DiscordButtonBuilder()
        .setLabel("🟥?")
        .setStyle(DiscordButtonStyle.Primary);
    } else {
      contentLines.push("-# There is currently no blood deck to draw.");
    }
    buttonMap.cancel = new DiscordButtonBuilder()
      .setLabel("Cancel")
      .setStyle(DiscordButtonStyle.Secondary);
    const interactionResponse: DiscordInteractionResponse =
      await Discord.sendPersistentInteractionResponse(
        discordInteraction,
        Utils.linesToString(contentLines),
        true,
        buttonMap,
      );
    const buttonInteraction: DiscordButtonInteraction | null =
      await this.handleButtonInteraction(
        interactionResponse,
        discordInteraction,
        "_Card draw action timed out._",
      );
    if (buttonInteraction === null) {
      return null;
    }

    switch (buttonInteraction.customId) {
      case "bloodDeck":
        return [buttonInteraction, PlayerCardSource.BLOOD_DECK];
      case "bloodDiscard":
        return [buttonInteraction, PlayerCardSource.BLOOD_DISCARD];
      case "sandDeck":
        return [buttonInteraction, PlayerCardSource.SAND_DECK];
      case "sandDiscard":
        return [buttonInteraction, PlayerCardSource.SAND_DISCARD];
      case "cancel":
        await Discord.deleteSentItem(interactionResponse);
        return null;
      default:
        Log.throw(
          "Cannot resolve choose draw source prompt. Unknown button interaction response ID.",
          buttonInteraction.customId,
        );
    }
  }

  public static async promptChooseImposterDie(
    player: PlayerState,
    playerCard: PlayerCard,
    discordInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
  ): Promise<[DiscordButtonInteraction, number] | null> {
    if (
      playerCard.card.type !== CardType.IMPOSTER ||
      playerCard.dieRollValues.length !== 2
    ) {
      Log.throw(
        "Cannot prompt choose imposter die. Invalid player card type or die roll values.",
        playerCard,
      );
    }
    const buttonMap: Record<string, DiscordButtonBuilder> = {
      firstDie: new DiscordButtonBuilder()
        .setLabel(playerCard.dieRollValues[0].toString())
        .setStyle(DiscordButtonStyle.Primary),
      secondDie: new DiscordButtonBuilder()
        .setLabel(playerCard.dieRollValues[1].toString())
        .setStyle(DiscordButtonStyle.Primary),
    };
    const contentLines: string[] = [
      "### Choose Die Result",
      `Choose the die value that you want to use for your \`${this.formatCardString(playerCard.card)}\` card.`,
      `## \`${this.formatCardString(player.currentSandCards[0])}\` \`${this.formatCardString(player.currentBloodCards[0])}\``,
    ];
    const interactionResponse: DiscordInteractionResponse =
      await Discord.sendPersistentInteractionResponse(
        discordInteraction,
        Utils.linesToString(contentLines),
        true,
        buttonMap,
      );
    const buttonInteraction: DiscordButtonInteraction | null =
      await this.handleButtonInteraction(
        interactionResponse,
        discordInteraction,
        "_Die selection prompt timed out._",
      );
    if (buttonInteraction === null) {
      return null;
    }

    switch (buttonInteraction.customId) {
      case "firstDie":
        return [buttonInteraction, playerCard.dieRollValues[0]];
      case "secondDie":
        return [buttonInteraction, playerCard.dieRollValues[1]];
      default:
        Log.throw(
          "Cannot resolve choose imposter die prompt. Unknown button interaction response ID.",
          buttonInteraction.customId,
        );
    }
  }

  public static async promptChooseTurnAction(
    session: SessionState,
    player: PlayerState,
    discordInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
  ): Promise<[DiscordButtonInteraction, TurnAction] | null> {
    const drawDisabled: boolean =
      player.currentSpentTokenTotal === player.currentTokenTotal ||
      (session.bloodDeck.length === 0 &&
        session.bloodDiscard.length === 0 &&
        session.sandDeck.length === 0 &&
        session.sandDiscard.length === 0);
    const buttonMap: Record<string, DiscordButtonBuilder> = {
      draw: new DiscordButtonBuilder()
        .setLabel("Draw")
        .setStyle(DiscordButtonStyle.Success)
        .setDisabled(drawDisabled),
      stand: new DiscordButtonBuilder()
        .setLabel("Stand")
        .setStyle(DiscordButtonStyle.Primary),
      cancel: new DiscordButtonBuilder()
        .setLabel("Cancel")
        .setStyle(DiscordButtonStyle.Secondary),
    };
    const contentLines: string[] = [
      this.formatHandRoundMessage(session),
      "### Discard",
      this.formatTableDiscardMessage(session),
      "### Your Items",
      this.formatPlayerItemsMessage(player),
      "",
      "**Choose your turn action.**",
    ];
    if (drawDisabled) {
      contentLines.push(
        "-# **Draw** is disabled because you have no remaining tokens.",
      );
    }
    const interactionResponse: DiscordInteractionResponse =
      await Discord.sendPersistentInteractionResponse(
        discordInteraction,
        Utils.linesToString(contentLines),
        true,
        buttonMap,
      );
    const buttonInteraction: DiscordButtonInteraction | null =
      await this.handleButtonInteraction(
        interactionResponse,
        discordInteraction,
        "*_Turn play timed out._",
      );
    if (buttonInteraction === null) {
      return null;
    }

    switch (buttonInteraction.customId) {
      case "draw":
        return [buttonInteraction, TurnAction.DRAW];
      case "stand":
        return [buttonInteraction, TurnAction.STAND];
      case "cancel":
        await Discord.deleteSentItem(interactionResponse);
        return null;
      default:
        Log.throw(
          "Cannot resolve choose turn action prompt. Unknown button interaction response ID.",
          buttonInteraction.customId,
        );
    }
  }

  public static async promptEndCurrentGame(
    discordInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
  ): Promise<DiscordButtonInteraction | null> {
    const buttonMap: Record<string, DiscordButtonBuilder> = {
      endGame: new DiscordButtonBuilder()
        .setLabel("End Game")
        .setStyle(DiscordButtonStyle.Danger),
      cancel: new DiscordButtonBuilder()
        .setLabel("Cancel")
        .setStyle(DiscordButtonStyle.Secondary),
    };
    const contentLines: string[] = [
      "## Game Is In Progress",
      "Do you want to end it and start a new game?",
    ];
    const interactionResponse: DiscordInteractionResponse =
      await Discord.sendPersistentInteractionResponse(
        discordInteraction,
        Utils.linesToString(contentLines),
        true,
        buttonMap,
      );
    const buttonInteraction: DiscordButtonInteraction | null =
      await this.handleButtonInteraction(
        interactionResponse,
        discordInteraction,
        "*_End game prompt timed out._",
      );
    if (buttonInteraction === null) {
      return null;
    }

    switch (buttonInteraction.customId) {
      case "endGame":
        return buttonInteraction;
      case "cancel":
        await Discord.deleteSentItem(interactionResponse);
        return null;
      default:
        Log.throw(
          "Cannot resolve end current game prompt. Unknown button interaction response ID.",
          buttonInteraction.customId,
        );
    }
  }

  public static async promptNewGameMembers(
    channelId: string,
    startingDiscordUser: DiscordUser,
    discordInteraction: DiscordMessageComponentInteraction | null = null,
    discordUserAccumulator: DiscordUser[] = [],
  ): Promise<DiscordUser[] | null> {
    const discordUserList: DiscordUser[] = [
      startingDiscordUser,
      ...discordUserAccumulator,
    ];
    const buttonMap: Record<string, DiscordButtonBuilder> = {
      joinGame: new DiscordButtonBuilder()
        .setLabel("Join Game")
        .setStyle(DiscordButtonStyle.Primary),
      startGame: new DiscordButtonBuilder()
        .setLabel("Start Game")
        .setStyle(DiscordButtonStyle.Success)
        .setDisabled(discordUserList.length <= 1),
    };
    const baseContentLines: string[] = [
      "# New Game",
      `Hey ${this.formatChannelTagString()}! A new game was started by ${this.formatPlayerNameString(startingDiscordUser)}.`,
      "### Players",
      discordUserList
        .map(
          (discordUser) =>
            `- ${this.formatPlayerNameString(discordUser)} (${this.formatPlayerTagString(discordUser)})`,
        )
        .join("\n"),
    ];
    const outboundContentLines: string[] = [
      ...baseContentLines,
      "",
      "**Click the button below to join!**",
    ];
    let outbound: DiscordMessage | DiscordInteractionResponse;
    if (discordInteraction === null) {
      outbound = await Discord.sendMessage(
        channelId,
        Utils.linesToString(outboundContentLines),
        buttonMap,
      );
    } else {
      outbound = await Discord.updateInteractionSourceItem(
        discordInteraction,
        Utils.linesToString(outboundContentLines),
        buttonMap,
      );
    }
    const buttonInteraction: DiscordButtonInteraction | null =
      await this.handleButtonInteraction(
        outbound,
        null,
        "_Game creation timed out._",
        600000,
      );
    if (buttonInteraction === null) {
      return null;
    }

    switch (buttonInteraction.customId) {
      case "joinGame":
        if (
          startingDiscordUser.id !== buttonInteraction.user.id &&
          !discordUserAccumulator.some(
            (discordUser) => discordUser.id === buttonInteraction.user.id,
          )
        ) {
          discordUserAccumulator.push(buttonInteraction.user);
        }
        return this.promptNewGameMembers(
          channelId,
          startingDiscordUser,
          buttonInteraction,
          discordUserAccumulator,
        );
      case "startGame":
        await Discord.updateInteractionSourceItem(
          buttonInteraction,
          Utils.linesToString([
            ...baseContentLines,
            "",
            "**The game has started!**",
          ]),
          {},
        );
        return [startingDiscordUser, ...discordUserAccumulator];
      default:
        Log.throw(
          "Cannot resolve new game member prompt. Unknown button interaction response ID.",
          buttonInteraction.customId,
        );
    }
  }

  public static async promptRevealCards(
    discordInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
  ): Promise<DiscordButtonInteraction | null> {
    const buttonMap: Record<string, DiscordButtonBuilder> = {
      revealCards: new DiscordButtonBuilder()
        .setLabel("Reveal Cards")
        .setStyle(DiscordButtonStyle.Primary),
      cancel: new DiscordButtonBuilder()
        .setLabel("Cancel")
        .setStyle(DiscordButtonStyle.Secondary),
    };
    const contentLines: string[] = [
      "### Reveal Your Cards",
      "Click the button below to reveal your cards and complete your hand.",
    ];
    const interactionResponse: DiscordInteractionResponse =
      await Discord.sendPersistentInteractionResponse(
        discordInteraction,
        Utils.linesToString(contentLines),
        true,
        buttonMap,
      );
    const buttonInteraction: DiscordButtonInteraction | null =
      await this.handleButtonInteraction(
        interactionResponse,
        discordInteraction,
        "_Reveal cards prompt timed out._",
      );
    if (buttonInteraction === null) {
      return null;
    }

    switch (buttonInteraction.customId) {
      case "revealCards":
        return buttonInteraction;
      case "cancel":
        await Discord.deleteSentItem(interactionResponse);
        return null;
      default:
        Log.throw(
          "Cannot resolve reveal cards prompt. Unknown button interaction response ID.",
          buttonInteraction.customId,
        );
    }
  }

  public static async promptRollForImposter(
    player: PlayerState,
    playerCard: PlayerCard,
    discordInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
  ): Promise<DiscordButtonInteraction | null> {
    if (
      playerCard.card.type !== CardType.IMPOSTER ||
      playerCard.dieRollValues.length > 0
    ) {
      Log.throw(
        "Cannot prompt roll for imposter. Invalid card type or die roll values.",
        playerCard,
      );
    }
    const buttonMap: Record<string, DiscordButtonBuilder> = {
      rollDice: new DiscordButtonBuilder()
        .setLabel("Roll Dice")
        .setStyle(DiscordButtonStyle.Primary),
      cancel: new DiscordButtonBuilder()
        .setLabel("Cancel")
        .setStyle(DiscordButtonStyle.Secondary),
    };
    const contentLines: string[] = [
      "### Roll For Imposter",
      `Roll the dice to get a value for your \`${this.formatCardString(playerCard.card)}\` card.`,
      `## \`${this.formatCardString(player.currentSandCards[0])}\` \`${this.formatCardString(player.currentBloodCards[0])}\``,
    ];
    const interactionResponse: DiscordInteractionResponse =
      await Discord.sendPersistentInteractionResponse(
        discordInteraction,
        Utils.linesToString(contentLines),
        true,
        buttonMap,
      );
    const buttonInteraction: DiscordButtonInteraction | null =
      await this.handleButtonInteraction(
        interactionResponse,
        discordInteraction,
        "_Dice roll prompt timed out._",
      );
    if (buttonInteraction === null) {
      return null;
    }

    switch (buttonInteraction.customId) {
      case "rollDice":
        return buttonInteraction;
      case "cancel":
        await Discord.deleteSentItem(interactionResponse);
        return null;
      default:
        Log.throw(
          "Cannot resolve roll for imposter prompt. Unknown button interaction response ID.",
          buttonInteraction.customId,
        );
    }
  }
}
