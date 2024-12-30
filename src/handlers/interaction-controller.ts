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
import {
  CardSuit,
  CardType,
  DrawSource,
  SessionStatus,
  TurnAction,
} from "../enums";
import {
  Card,
  PlayerState,
  SessionState,
  TurnHistoryEntry,
} from "../types";
import {
  Utils,
} from "../utils";

// TODO: optimize this, lots of opportunities to simplify
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

  public static async announceTurnEnded(
    session: SessionState,
  ): Promise<void> {
    const turnPlayer: PlayerState = session.players[(session.currentPlayerIndex === 0 ? session.players.length : session.currentPlayerIndex) - 1];
    const turnHistoryEntry: TurnHistoryEntry = turnPlayer.turnHistory[turnPlayer.turnHistory.length - 1];
    const contentLines: string[] = [
    ];
    switch (turnHistoryEntry.turnAction) {
      case TurnAction.DRAW:
        contentLines.push(`# ${turnPlayer.globalName ?? turnPlayer.username} Drew A Card`);
        switch (turnHistoryEntry.drawSource) {
          case DrawSource.BLOOD_DECK:
            contentLines.push("- A card was drawn from the **blood deck**.");
            break;
          case DrawSource.BLOOD_DISCARD:
            contentLines.push("- A card was drawn from the **blood discard**.");
            break;
          case DrawSource.SAND_DECK:
            contentLines.push("- A card was drawn from the **sand deck**.");
            break;
          case DrawSource.SAND_DISCARD:
            contentLines.push("- A card was drawn from the **sand discard**.");
            break;
          default:
            throw new Error("Unknown draw source.");
        }
        contentLines.push(`- \`${this.formatCardString(turnHistoryEntry.discardedCard)}\` was discarded.`);
        break;
      case TurnAction.STAND:
        contentLines.push(`# ${turnPlayer.globalName ?? turnPlayer.username} Stood`);
        contentLines.push("- No card was drawn or discarded.");
        break;
      default:
        throw new Error("Unknown turn action.");
    }
    await Discord.sendMessage(
      session.channelId,
      Utils.linesToString(contentLines),
    );
    if (session.status === SessionStatus.COMPLETED) {
      // TODO: Announce game result here
      await Discord.sendMessage(
        session.channelId,
        "# End!",
      );
    } else if (session.status === SessionStatus.ACTIVE) {
      if (session.currentRoundIndex === 0 && session.currentPlayerIndex === 0) {
        // TODO: Announce hand result here
        await Discord.sendMessage(
          session.channelId,
          `# Starting Hand ${(session.currentHandIndex + 1).toString()}`,
        );
      } else if (session.currentPlayerIndex === 0) {
        await Discord.sendMessage(
          session.channelId,
          `# Starting Round ${(session.currentRoundIndex + 1).toString()}`,
        );
      }
      await this.announceTurnStarted(session);
    } else {
      throw new Error("Turn ended with unknown session status.");
    }
  }

  public static async announceTurnStarted(
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

  public static async informTurnEnded(
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

  public static async promptChooseDiscardCard(
    session: SessionState,
    player: PlayerState,
    discordInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  ): Promise<[DiscordButtonInteraction, Card] | undefined> {
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
      return undefined;
    } else {
      if (!(buttonInteraction.customId in discardMap)) {
        throw new Error();
      }
      const card: Card = discardMap[buttonInteraction.customId];
      return [
        buttonInteraction,
        card,
      ];
    }
  }

  public static async promptChooseDrawSource(
    session: SessionState,
    player: PlayerState,
    discordInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  ): Promise<[DiscordButtonInteraction, DrawSource] | undefined> {
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
      return undefined;
    } else {
      switch (buttonInteraction.customId) {
        case "bloodDeck":
          return [
            buttonInteraction,
            DrawSource.BLOOD_DECK,
          ];
        case "bloodDiscard":
          return [
            buttonInteraction,
            DrawSource.BLOOD_DISCARD,
          ];
        case "sandDeck":
          return [
            buttonInteraction,
            DrawSource.SAND_DECK,
          ];
        case "sandDiscard":
          return [
            buttonInteraction,
            DrawSource.SAND_DISCARD,
          ];
        default:
          throw new Error(`Unknown response ID "${buttonInteraction.customId}".`);
      }
    }
  }

  public static async promptChooseTurnAction(
    session: SessionState,
    player: PlayerState,
    discordInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  ): Promise<[DiscordButtonInteraction, TurnAction] | null | undefined> {
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
      return undefined;
    } else {
      switch (buttonInteraction.customId) {
        case "draw":
          return [
            buttonInteraction,
            TurnAction.DRAW,
          ];
        case "stand":
          return [
            buttonInteraction,
            TurnAction.STAND,
          ];
        case "cancel":
          await Discord.deleteSentItem(interactionResponse);
          return null;
        default:
          throw new Error(`Unknown response ID "${buttonInteraction.customId}".`);
      }
    }
  }

  public static async promptEndCurrentGame(
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

  public static async promptNewGameMembers(
    channelId: string,
    startingDiscordUser: DiscordUser,
    discordInteraction: DiscordMessageComponentInteraction | null = null,
    discordUserAccumulator: DiscordUser[] = [
    ],
  ): Promise<DiscordUser[] | undefined> {
    const discordUserList: DiscordUser[] = [
      startingDiscordUser,
      ...discordUserAccumulator,
    ];
    const buttonMap: Record<string, DiscordButtonBuilder> = {
      "joinGame": new DiscordButtonBuilder()
        .setLabel("Join Game")
        .setStyle(DiscordButtonStyle.Primary),
      "startGame": new DiscordButtonBuilder()
        .setLabel("Start Game")
        .setStyle(DiscordButtonStyle.Success)
        .setDisabled(discordUserList.length <= 1),
    };
    const baseContentLines: string[] = [
      "# New Game",
      `A new game was started by <@${startingDiscordUser.id}> (${startingDiscordUser.globalName ?? startingDiscordUser.username}).`,
      "## Players",
      discordUserList.map(discordUser => `- <@${discordUser.id}> (${discordUser.globalName ?? discordUser.username})`).join("\n"),
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
    const buttonInteraction: DiscordButtonInteraction | null = await Discord.getButtonInteraction(
      outbound,
      null,
      300000, // 5 minutes
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
      return undefined;
    } else {
      switch (buttonInteraction.customId) {
        case "joinGame":
          // Add the user if not already in the list
          if (startingDiscordUser.id !== buttonInteraction.user.id && !discordUserAccumulator.some(discordUser => discordUser.id === buttonInteraction.user.id)) {
            discordUserAccumulator.push(buttonInteraction.user);
          }
          return this.promptNewGameMembers(
            channelId,
            startingDiscordUser,
            buttonInteraction,
            discordUserAccumulator,
          );
        case "startGame": {
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
          return [
            startingDiscordUser,
            ...discordUserAccumulator,
          ];
        }
        default:
          throw new Error(`Unknown response ID "${buttonInteraction.customId}".`);
      }
    }
  }
}
