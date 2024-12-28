import {
  Discord,
  DiscordButtonBuilder,
  DiscordButtonInteraction,
  DiscordButtonStyle,
  DiscordCommandInteraction,
  DiscordInteractionResponse,
  DiscordMessage,
  DiscordMessageComponentInteraction,
} from "../discord";
import {
  CardSuit,
  CardType,
} from "../enums";
import {
  Card,
  PlayerState,
  SessionState,
} from "../types";
import {
  Utils,
} from "../utils";
import {
  GameController,
} from "./game-controller";
import {
  SessionController,
} from "./session-controller";

export class InteractionController {
  private static formatCardString(
    card: Card,
  ): string {
    const suitSymbols: Record<CardSuit, string> = {
      [CardSuit.BLOOD]: "🟥",
      [CardSuit.SAND]: "🟨",
    };
    const typeLabels: Record<CardType, string> = {
      [CardType.IMPOSTER]: "Imposter",
      [CardType.NUMBER]: card.value.toString(),
      [CardType.SYLOP]: "Sylop",
    };
    const suitSymbol: string = suitSymbols[card.suit];
    const typeLabel: string = typeLabels[card.type];
    if (!suitSymbol || !typeLabel) {
      throw new Error(`Card had unknown suit (${card.suit.toString()}) or type (${card.type.toString()}).`);
    }
    return `${suitSymbol}${typeLabel}`;
  }

  private static formatHandRoundMessage(
    session: SessionState,
  ): string {
    return `**Hand:** \`${(session.currentHandIndex + 1).toString()}\`  |  **Round:** \`${(session.currentRoundIndex + 1).toString()}/3\``;
  }

  private static formatPlayerItemsMessage(
    player: PlayerState,
  ): string {
    const bloodCardsString: string = player.currentBloodCards
      .map(card => `\`${this.formatCardString(card)}\``)
      .join(" ") || "`None`";
    const sandCardsString: string = player.currentSandCards
      .map(card => `\`${this.formatCardString(card)}\``)
      .join(" ") || "`None`";
    const contentLines: string[] = [
      `Sand: ${sandCardsString}`,
      `Blood: ${bloodCardsString}`,
      `Tokens: \`${this.formatTokenString(player)}\``,
    ];
    return Utils.linesToString(contentLines);
  }

  private static formatPlayerListMessage(
    session: SessionState,
  ): string {
    const messageLineGroups: string[][] = [
    ];
    for (const [
      playerIndex,
      player,
    ] of session.players.entries()) {
      const contentLines: string[] = [
        `${(playerIndex + 1).toString()}. **${player.globalName ?? player.username}**${playerIndex === session.currentPlayerIndex ? " 👤" : ""}`,
        `  - Tokens: \`${this.formatTokenString(player)}\``,
      ];
      messageLineGroups.push(contentLines);
    }
    return messageLineGroups.flat(1).join("\n");
  }

  private static formatTableDiscardMessage(
    session: SessionState,
  ): string {
    const bloodDiscardString: string = session.bloodDiscard.length > 0 ? `\`${this.formatCardString(session.bloodDiscard[0])}\`` : "`None`";
    const sandDiscardString: string = session.sandDiscard.length > 0 ? `\`${this.formatCardString(session.sandDiscard[0])}\`` : "`None`";
    const contentLines: string[] = [
      `Sand: ${sandDiscardString}`,
      `Blood: ${bloodDiscardString}`,
    ];
    return Utils.linesToString(contentLines);
  }

  private static formatTokenString(
    player: PlayerState,
  ): string {
    let tokenString: string = "";
    tokenString += "⚪".repeat(player.currentUnspentTokenTotal);
    tokenString += "⚫".repeat(player.currentSpentTokenTotal);
    if (tokenString.length === 0) {
      tokenString = "None";
    }
    return tokenString;
  }

  private static async informTurnEnd(
    discordInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  ): Promise<void> {
    const contentLines: string[] = [
      "**Your turn is complete.**",
    ];
    await Discord.sendPersistentInteractionResponse(
      discordInteraction,
      Utils.linesToString(contentLines),
      true,
      {},
    );
  }

  private static async promptChooseDiscardCard(
    session: SessionState,
    player: PlayerState,
    discordInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  ): Promise<void> {
    const buttonMap: Record<string, DiscordButtonBuilder> = {};
    const contentLines: string[] = [
      this.formatHandRoundMessage(session),
      "## Discard",
      this.formatTableDiscardMessage(session),
      "## Your Items",
      this.formatPlayerItemsMessage(player),
      "",
      "**Choose a card to discard.**",
    ];
    let cardSet: Card[];
    if (player.currentBloodCards.length > 1) {
      cardSet = player.currentBloodCards;
    } else if (player.currentSandCards.length > 1) {
      cardSet = player.currentSandCards;
    } else {
      throw new Error("Player does not require a discard.");
    }
    const discardMap: Record<string, Card> = {};
    cardSet.forEach((card, index) => {
      const key: string = `discardOption${index.toString()}`;
      discardMap[key] = card;
      buttonMap[key] = new DiscordButtonBuilder()
        .setLabel(this.formatCardString(card))
        .setStyle(DiscordButtonStyle.Primary);
    });
    const interactionResponse: DiscordInteractionResponse = await Discord.sendPersistentInteractionResponse(
      discordInteraction,
      Utils.linesToString(contentLines),
      true,
      buttonMap,
    );
    const buttonInteraction: DiscordButtonInteraction | null = await Discord.getButtonInteraction(
      interactionResponse,
      (i) => i.user.id === discordInteraction.user.id,
    );
    if (buttonInteraction === null) {
      await Discord.updateSentItem(
        interactionResponse,
        "**Discard action timed out.**",
        {},
      );
    } else {
      if (!(buttonInteraction.customId in discardMap)) {
        throw new Error();
      }
      const card: Card = discardMap[buttonInteraction.customId];
      GameController.playerDiscardCard(
        session,
        player,
        card,
      );
      await this.informTurnEnd(buttonInteraction);
    }
  }

  private static async promptChooseDrawSource(
    session: SessionState,
    player: PlayerState,
    discordInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  ): Promise<void> {
    const buttonMap: Record<string, DiscordButtonBuilder> = {};
    const contentLines: string[] = [
      this.formatHandRoundMessage(session),
      "## Discard",
      this.formatTableDiscardMessage(session),
      "## Your Items",
      this.formatPlayerItemsMessage(player),
      "",
      "**Choose a draw option.**",
    ];
    if (session.sandDiscard.length > 0) {
      buttonMap.sandDiscardDraw = new DiscordButtonBuilder()
        .setLabel(this.formatCardString(session.sandDiscard[0]))
        .setStyle(DiscordButtonStyle.Primary);
    } else {
      contentLines.push("-# There is currently no sand discard to draw.");
    }
    if (session.bloodDiscard.length > 0) {
      buttonMap.bloodDiscardDraw = new DiscordButtonBuilder()
        .setLabel(this.formatCardString(session.bloodDiscard[0]))
        .setStyle(DiscordButtonStyle.Primary);
    } else {
      contentLines.push("-# There is currently no blood discard to draw.");
    }
    if (session.sandDeck.length > 0) {
      buttonMap.sandDeckDraw = new DiscordButtonBuilder()
        .setLabel("🟨?")
        .setStyle(DiscordButtonStyle.Primary);
    } else {
      contentLines.push("-# There is currently no sand deck to draw.");
    }
    if (session.bloodDeck.length > 0) {
      buttonMap.bloodDeckDraw = new DiscordButtonBuilder()
        .setLabel("🟥?")
        .setStyle(DiscordButtonStyle.Primary);
    } else {
      contentLines.push("-# There is currently no blood deck to draw.");
    }
    buttonMap.cancel = new DiscordButtonBuilder()
      .setLabel("Cancel")
      .setStyle(DiscordButtonStyle.Secondary);
    const interactionResponse: DiscordInteractionResponse = await Discord.sendPersistentInteractionResponse(
      discordInteraction,
      Utils.linesToString(contentLines),
      true,
      buttonMap,
    );
    const buttonInteraction: DiscordButtonInteraction | null = await Discord.getButtonInteraction(
      interactionResponse,
      (i) => i.user.id === discordInteraction.user.id,
    );
    if (buttonInteraction === null) {
      await Discord.updateSentItem(
        interactionResponse,
        "**Card draw action timed out.**",
        {},
      );
    } else {
      switch (buttonInteraction.customId) {
        case "sandDiscardDraw":
          GameController.playerSpendToken(
            session,
            player,
          );
          GameController.playerDrawCard(
            session,
            player,
            CardSuit.SAND,
            true,
          );
          await this.promptChooseDiscardCard(
            session,
            player,
            buttonInteraction,
          );
          break;
        case "bloodDiscardDraw":
          GameController.playerSpendToken(
            session,
            player,
          );
          GameController.playerDrawCard(
            session,
            player,
            CardSuit.BLOOD,
            true,
          );
          await this.promptChooseDiscardCard(
            session,
            player,
            buttonInteraction,
          );
          break;
        case "sandDeckDraw":
          GameController.playerSpendToken(
            session,
            player,
          );
          GameController.playerDrawCard(
            session,
            player,
            CardSuit.SAND,
            false,
          );
          await this.promptChooseDiscardCard(
            session,
            player,
            buttonInteraction,
          );
          break;
        case "bloodDeckDraw":
          GameController.playerSpendToken(
            session,
            player,
          );
          GameController.playerDrawCard(
            session,
            player,
            CardSuit.BLOOD,
            false,
          );
          await this.promptChooseDiscardCard(
            session,
            player,
            buttonInteraction,
          );
          break;
        case "cancel":
          await this.promptChooseTurnAction(
            session,
            player,
            buttonInteraction,
          );
          break;
        default:
          throw new Error(`Unknown response ID "${buttonInteraction.customId}".`);
      }
    }
  }

  private static async promptConfirmStand(
    discordInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  ): Promise<void> {
    await this.informTurnEnd(discordInteraction);
  }

  public static async announceTurnStart(
    session: SessionState,
  ): Promise<void> {
    const contentLines: string[] = [
      `# <@${session.players[session.currentPlayerIndex].id}>'s Turn`,
      this.formatHandRoundMessage(session),
      "## Discard",
      this.formatTableDiscardMessage(session),
      "## Players",
      this.formatPlayerListMessage(session),
      "",
      "-# Use the **/play** command to play your turn.",
      "-# Use the **/info** command to view your hand and see game info.",
    ];
    await Discord.sendMessage(
      session.channelId,
      Utils.linesToString(contentLines),
    );
  }

  public static async informNoGame(
    discordInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  ): Promise<void> {
    const contentLines: string[] = [
      "**There is no game currently active in this channel.**",
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
    discordInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  ): Promise<void> {
    await Discord.sendPersistentInteractionResponse(
      discordInteraction,
      "**You are not part of the current game.**",
      true,
      {},
    );
  }

  public static async informNotTurn(
    session: SessionState,
    discordInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  ): Promise<void> {
    const currentPlayer: PlayerState = session.players[session.currentPlayerIndex];
    const contentLines: string[] = [
      `**It is currently ${currentPlayer.globalName ?? currentPlayer.username}'s turn.**`,
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
    discordInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  ): Promise<void> {
    const isPlayerTurn: boolean = session.players[session.currentPlayerIndex].id === discordInteraction.user.id;
    const contentLines: string[] = [
      isPlayerTurn ? "# Your Turn" : `# ${session.players[session.currentPlayerIndex].username}'s Turn`,
      this.formatHandRoundMessage(session),
      "## Discard",
      this.formatTableDiscardMessage(session),
      "## Players",
      this.formatPlayerListMessage(session),
      "## Your Items",
      this.formatPlayerItemsMessage(player),
    ];
    if (isPlayerTurn) {
      contentLines.push("");
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
    discordInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  ): Promise<void> {
    await Discord.sendPersistentInteractionResponse(
      discordInteraction,
      "**Starting a new game...**",
      true,
      {},
    );
  }

  public static async promptChooseTurnAction(
    session: SessionState,
    player: PlayerState,
    discordInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  ): Promise<void> {
    if (GameController.playerHasPendingDiscard(player)) {
      return this.promptChooseDiscardCard(
        session,
        player,
        discordInteraction,
      );
    }
    const buttonMap: Record<string, DiscordButtonBuilder> = {};
    const drawDisabled: boolean =
      player.currentUnspentTokenTotal === 0 ||
      (
        session.bloodDeck.length === 0 &&
        session.bloodDiscard.length === 0 &&
        session.sandDeck.length === 0 &&
        session.sandDiscard.length === 0
      ) ? true : false;
    const contentLines: string[] = [
      this.formatHandRoundMessage(session),
      "## Discard",
      this.formatTableDiscardMessage(session),
      "## Your Items",
      this.formatPlayerItemsMessage(player),
      "",
      "**Choose your turn action.**",
    ];
    if (drawDisabled) {
      contentLines.push("-# **Draw** is disabled because you have no remaining tokens.");
    }
    buttonMap.draw = new DiscordButtonBuilder()
      .setLabel("Draw")
      .setStyle(DiscordButtonStyle.Success)
      .setDisabled(drawDisabled);
    buttonMap.stand = new DiscordButtonBuilder()
      .setLabel("Stand")
      .setStyle(DiscordButtonStyle.Primary);
    buttonMap.cancel = new DiscordButtonBuilder()
      .setLabel("Cancel")
      .setStyle(DiscordButtonStyle.Secondary);
    const interactionResponse: DiscordInteractionResponse = await Discord.sendPersistentInteractionResponse(
      discordInteraction,
      Utils.linesToString(contentLines),
      true,
      buttonMap,
    );
    const buttonInteraction: DiscordButtonInteraction | null = await Discord.getButtonInteraction(
      interactionResponse,
      (i) => i.user.id === discordInteraction.user.id,
    );
    if (buttonInteraction === null) {
      await Discord.updateSentItem(
        interactionResponse,
        "**Turn play timed out.**",
        {},
      );
    } else {
      switch (buttonInteraction.customId) {
        case "draw":
          await this.promptChooseDrawSource(
            session,
            player,
            buttonInteraction,
          );
          break;
        case "stand":
          await this.promptConfirmStand(buttonInteraction);
          break;
        case "cancel":
          await Discord.deleteSentItem(interactionResponse);
          break;
        default:
          throw new Error(`Unknown response ID "${buttonInteraction.customId}".`);
      }
    }
  }

  public static async promptEndGame(
    discordInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  ): Promise<boolean> {
    const buttonMap: Record<string, DiscordButtonBuilder> = {
      "endGame": new DiscordButtonBuilder()
        .setLabel("End Game")
        .setStyle(DiscordButtonStyle.Danger),
      "cancel": new DiscordButtonBuilder()
        .setLabel("Cancel")
        .setStyle(DiscordButtonStyle.Secondary),
    };
    const contentLines: string[] = [
      "**A game is currently active in this channel.**",
      "Do you want to end it and start a new game?",
    ];
    const interactionResponse: DiscordInteractionResponse = await Discord.sendPersistentInteractionResponse(
      discordInteraction,
      Utils.linesToString(contentLines),
      true,
      buttonMap,
    );
    const buttonInteraction: DiscordButtonInteraction | null = await Discord.getButtonInteraction(
      interactionResponse,
      (i) => i.user.id === discordInteraction.user.id,
    );
    if (buttonInteraction === null) {
      await Discord.updateSentItem(
        interactionResponse,
        "**End game prompt timed out.**",
      );
      return false;
    } else {
      switch (buttonInteraction.customId) {
        case "endGame":
          await this.informStartingGame(buttonInteraction);
          return true;
        case "cancel":
          await Discord.deleteSentItem(interactionResponse);
          return false;
        default:
          throw new Error(`Unknown response ID "${buttonInteraction.customId}".`);
      }
    }
  }

  public static async promptJoinGame(
    session: SessionState,
    discordInteraction: DiscordMessageComponentInteraction | null = null,
  ): Promise<void> {
    const buttonMap: Record<string, DiscordButtonBuilder> = {
      "joinGame": new DiscordButtonBuilder()
        .setLabel("Join Game")
        .setStyle(DiscordButtonStyle.Primary),
      "startGame": new DiscordButtonBuilder()
        .setLabel("Start Game")
        .setStyle(DiscordButtonStyle.Success)
        .setDisabled(session.players.length <= 1),
    };
    const baseContentLines: string[] = [
      "# New Game",
      `A new game was started by <@${session.startingPlayer.id}> (${session.startingPlayer.globalName ?? session.startingPlayer.username}).`,
      "## Players",
      session.players.map(p => `- <@${p.id}> (${p.globalName ?? p.username})`).join("\n"),
    ];
    const outboundContentLines: string[] = [
      ...baseContentLines,
      "",
      "**Click the button below to join!**",
    ];
    let outbound: DiscordMessage | DiscordInteractionResponse;
    if (discordInteraction === null) {
      outbound = await Discord.sendMessage(
        session.channelId,
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
    const buttonInteraction: DiscordButtonInteraction | null = await Discord.getButtonInteraction(
      outbound,
      null,
    );
    if (buttonInteraction === null) {
      const startedContentLines: string[] = [
        ...baseContentLines,
        "",
        "**Game creation timed out.**",
      ];
      await Discord.updateSentItem(
        outbound,
        Utils.linesToString(startedContentLines),
        {},
      );
    } else {
      switch (buttonInteraction.customId) {
        case "joinGame":
        {
          const existingPlayer: PlayerState | null = SessionController.getSessionPlayerById(
            session,
            buttonInteraction.user.id,
          );
          if (existingPlayer === null) {
            SessionController.addSessionPlayer(
              session,
              buttonInteraction.user,
            );
          }
          await this.promptJoinGame(
            session,
            buttonInteraction,
          );
          break;
        }
        case "startGame":
        {
          await GameController.startGame(session);
          const startedContentLines: string[] = [
            ...baseContentLines,
            "",
            "**The game has started!**",
          ];
          await Discord.updateInteractionSourceItem(
            buttonInteraction,
            Utils.linesToString(startedContentLines),
            {},
          );
          break;
        }
        default:
          throw new Error("Unknown response.");
      }
    }
  }
}
