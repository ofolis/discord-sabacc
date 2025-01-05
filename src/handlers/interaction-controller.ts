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
  PlayerCardSource,
  TurnAction,
} from "../enums";
import {
  Card,
  PlayerCard,
  PlayerState,
  SessionState,
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
    return `**Hand:** \`${
      (session.currentHandIndex + 1).toString()
    }\`  |  **Round:** \`${
      session.currentRoundIndex < 3 ? `${(session.currentRoundIndex + 1).toString()}/3` : "REVEAL"
    }\``;
  }

  private static formatPlayerItemsMessage(
    player: PlayerState,
  ): string {
    const bloodCardsString: string = player.currentBloodCards
      .map(playerCard => `\`${this.formatCardString(playerCard.card)}\``)
      .join(" ") || "`None`";
    const sandCardsString: string = player.currentSandCards
      .map(playerCard => `\`${this.formatCardString(playerCard.card)}\``)
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
    tokenString += "⚪".repeat(player.currentTokenTotal - player.currentSpentTokenTotal);
    tokenString += "⚫".repeat(player.currentSpentTokenTotal);
    if (tokenString.length === 0) {
      tokenString = "None";
    }
    return tokenString;
  }

  public static async announceGameEnded(
    session: SessionState,
  ): Promise<void> {
    await Discord.sendMessage(
      session.channelId,
      "# Ended Game",
    );
  }

  public static async announceGameStarted(
    session: SessionState,
  ): Promise<void> {
    await Discord.sendMessage(
      session.channelId,
      "# Starting Game",
    );
  }

  public static async announceHandEnded(
    session: SessionState,
  ): Promise<void> {
    await Discord.sendMessage(
      session.channelId,
      `# Ended Hand ${(session.currentHandIndex + 1).toString()}`,
    );
  }

  public static async announceRoundStarted(
    session: SessionState,
  ): Promise<void> {
    await Discord.sendMessage(
      session.channelId,
      `# Starting Round ${(session.currentRoundIndex + 1).toString()}`,
    );
  }

  public static async announceTurnEnded(
    session: SessionState,
  ): Promise<void> {
    const player: PlayerState = session.players[(session.currentPlayerIndex === 0 ? session.players.length : session.currentPlayerIndex) - 1];
    if (player.currentTurnRecord === null) {
      throw new Error("Player did not contain a turn record.");
    }
    const contentLines: string[] = [
    ];
    switch (player.currentTurnRecord.action) {
      case TurnAction.DRAW:
        if (player.currentTurnRecord.drawnCard === null) {
          throw new Error("Player turn record did not contain a drawn card.");
        }
        if (player.currentTurnRecord.discardedCard === null) {
          throw new Error("Player turn record did not contain a discarded card.");
        }
        contentLines.push(`# ${player.globalName ?? player.username} Drew A Card`);
        switch (player.currentTurnRecord.drawnCard.source) {
          case PlayerCardSource.BLOOD_DECK:
            contentLines.push("- A card was drawn from the **blood deck**.");
            break;
          case PlayerCardSource.BLOOD_DISCARD:
            contentLines.push("- A card was drawn from the **blood discard**.");
            break;
          case PlayerCardSource.SAND_DECK:
            contentLines.push("- A card was drawn from the **sand deck**.");
            break;
          case PlayerCardSource.SAND_DISCARD:
            contentLines.push("- A card was drawn from the **sand discard**.");
            break;
          default:
            throw new Error("Unknown draw source.");
        }
        contentLines.push(`- \`${this.formatCardString(player.currentTurnRecord.discardedCard.card)}\` was discarded.`);
        break;
      case TurnAction.STAND:
        contentLines.push(`# ${player.globalName ?? player.username} Stood`);
        contentLines.push("- No card was drawn or discarded.");
        break;
      default:
        throw new Error("Unknown turn action.");
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
  ): Promise<[DiscordButtonInteraction, PlayerCard] | undefined> {
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
    let playerCardSet: PlayerCard[];
    if (player.currentBloodCards.length > 1) {
      playerCardSet = player.currentBloodCards;
    } else if (player.currentSandCards.length > 1) {
      playerCardSet = player.currentSandCards;
    } else {
      throw new Error("Player does not require a discard.");
    }
    const discardMap: Record<string, PlayerCard> = {};
    playerCardSet.forEach((playerCard, index) => {
      const key: string = `discardOption${index.toString()}`;
      discardMap[key] = playerCard;
      buttonMap[key] = new DiscordButtonBuilder()
        .setLabel(this.formatCardString(playerCard.card))
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
        "_Discard action timed out._",
        {},
      );
      return undefined;
    } else {
      if (!(buttonInteraction.customId in discardMap)) {
        throw new Error();
      }
      const playerCard: PlayerCard = discardMap[buttonInteraction.customId];
      return [
        buttonInteraction,
        playerCard,
      ];
    }
  }

  public static async promptChooseDrawSource(
    session: SessionState,
    player: PlayerState,
    discordInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  ): Promise<[DiscordButtonInteraction, Exclude<PlayerCardSource, PlayerCardSource.DEALT>] | undefined> {
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
        "_Card draw action timed out._",
        {},
      );
      return undefined;
    } else {
      switch (buttonInteraction.customId) {
        case "bloodDeck":
          return [
            buttonInteraction,
            PlayerCardSource.BLOOD_DECK,
          ];
        case "bloodDiscard":
          return [
            buttonInteraction,
            PlayerCardSource.BLOOD_DISCARD,
          ];
        case "sandDeck":
          return [
            buttonInteraction,
            PlayerCardSource.SAND_DECK,
          ];
        case "sandDiscard":
          return [
            buttonInteraction,
            PlayerCardSource.SAND_DISCARD,
          ];
        default:
          throw new Error(`Unknown response ID "${buttonInteraction.customId}".`);
      }
    }
  }

  public static async promptChooseImposterDie(
    playerCard: PlayerCard,
    discordInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  ): Promise<[DiscordButtonInteraction, number] | undefined> {
    if (playerCard.card.type !== CardType.IMPOSTER) {
      throw new Error("Attempted set die value on a non-imposter card.");
    }
    if (playerCard.dieRollValues.length !== 2) {
      throw new Error("Imposter player card does not contain exactly two die roll values.");
    }
    const buttonMap: Record<string, DiscordButtonBuilder> = {
      "firstDie": new DiscordButtonBuilder()
        .setLabel(playerCard.dieRollValues[0].toString())
        .setStyle(DiscordButtonStyle.Primary),
      "secondDie": new DiscordButtonBuilder()
        .setLabel(playerCard.dieRollValues[1].toString())
        .setStyle(DiscordButtonStyle.Secondary),
    };
    const contentLines: string[] = [
      "# Choose Die Result",
      `Choose the die value that you want to use for your \`${this.formatCardString(playerCard.card)}\` card.`,
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
        "_Die selection prompt timed out._",
      );
      return;
    } else {
      switch (buttonInteraction.customId) {
        case "firstDie": {
          return [
            buttonInteraction,
            playerCard.dieRollValues[0],
          ];
        }
        case "secondDie":
          return [
            buttonInteraction,
            playerCard.dieRollValues[1],
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
  ): Promise<[DiscordButtonInteraction, TurnAction | null] | undefined> {
    const buttonMap: Record<string, DiscordButtonBuilder> = {};
    const drawDisabled: boolean =
      player.currentSpentTokenTotal === player.currentTokenTotal ||
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
        "*_Turn play timed out._",
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
          return [
            buttonInteraction,
            null,
          ];
        default:
          throw new Error(`Unknown response ID "${buttonInteraction.customId}".`);
      }
    }
  }

  public static async promptEndCurrentGame(
    discordInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  ): Promise<[DiscordButtonInteraction, boolean] | undefined> {
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
        "_End game prompt timed out._",
      );
      return;
    } else {
      switch (buttonInteraction.customId) {
        case "endGame":
          return [
            buttonInteraction,
            true,
          ];
        case "cancel":
          return [
            buttonInteraction,
            false,
          ];
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
        "_Game creation timed out._",
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

  public static async promptRollForImposter(
    playerCard: PlayerCard,
    discordInteraction: DiscordCommandInteraction | DiscordMessageComponentInteraction,
  ): Promise<[DiscordButtonInteraction, boolean] | undefined> {
    if (playerCard.card.type !== CardType.IMPOSTER) {
      throw new Error("Attempted to roll for a non-imposter card.");
    }
    if (playerCard.dieRollValues.length > 0) {
      throw new Error("Imposter player card already has one or more die roll values.");
    }
    const buttonMap: Record<string, DiscordButtonBuilder> = {
      "rollDice": new DiscordButtonBuilder()
        .setLabel("Roll Dice")
        .setStyle(DiscordButtonStyle.Primary),
      "cancel": new DiscordButtonBuilder()
        .setLabel("Cancel")
        .setStyle(DiscordButtonStyle.Secondary),
    };
    const contentLines: string[] = [
      "# Roll For Imposter",
      `Roll the dice to get a value for your \`${this.formatCardString(playerCard.card)}\` card.`,
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
        "_Dice roll prompt timed out._",
      );
      return;
    } else {
      switch (buttonInteraction.customId) {
        case "rollDice": {
          return [
            buttonInteraction,
            true,
          ];
        }
        case "cancel":
          return [
            buttonInteraction,
            false,
          ];
        default:
          throw new Error(`Unknown response ID "${buttonInteraction.customId}".`);
      }
    }
  }
}
