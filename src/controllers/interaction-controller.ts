import { DataController, GameController } from ".";
import { Log, Utils } from "../core";
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
} from "../core/discord";
import { CardSuit, CardType, PlayerCardSource, TurnAction } from "../enums";
import { Card, Player, PlayerCard, Session } from "../types";

export class InteractionController {
  private static formatCardSuitIcon(cardSuit: CardSuit): string {
    switch (cardSuit) {
      case CardSuit.BLOOD:
        return "🟥";
      case CardSuit.SAND:
        return "🟨";
      default:
        Log.throw("Cannot format card suit icon. Unknown card suit.", {
          cardSuit,
        });
    }
  }

  private static formatCardString(
    card: Card | PlayerCard,
    includeCodeQuotes: boolean = true,
  ): string {
    const playerCard: PlayerCard | null = "card" in card ? card : null;
    const actualCard: Card = "card" in card ? card.card : card;
    const suitIcon: string = this.formatCardSuitIcon(actualCard.suit);
    let typeLabel: string;
    switch (actualCard.type) {
      case CardType.IMPOSTER:
        typeLabel = "Imposter";
        break;
      case CardType.NUMBER:
        typeLabel = actualCard.value.toString();
        break;
      case CardType.SYLOP:
        typeLabel = "Sylop";
        break;
      default:
        Log.throw("Cannot format card string. Unknown card type.", actualCard);
    }
    if (
      playerCard !== null &&
      actualCard.type === CardType.IMPOSTER &&
      playerCard.dieRollValues.length === 1
    ) {
      typeLabel = `${playerCard.dieRollValues[0].toString()} (${typeLabel})`;
    }
    return includeCodeQuotes
      ? `\`${suitIcon}${typeLabel}\``
      : `${suitIcon}${typeLabel}`;
  }

  private static formatChannelTagString(): string {
    return "@everyone";
  }

  private static formatHandRoundMessage(session: Session): string {
    return `> ### Hand: \`${(session.currentHandIndex + 1).toString()}\`  |  Round: \`${session.currentRoundIndex < 3 ? `${(session.currentRoundIndex + 1).toString()}/3` : "REVEAL"}\``;
  }

  private static formatPlayerAvatarUrl(player: Player): string | null {
    if (player.avatarId === null) {
      return null;
    }
    return `https://cdn.discordapp.com/avatars/${player.id}/${player.avatarId}.webp?size=240`;
  }

  private static formatPlayerItemsMessage(player: Player): string {
    const cardStrings: string[] = [];
    player.currentSandCards.forEach(playerCard => {
      cardStrings.push(this.formatCardString(playerCard));
    });
    player.currentBloodCards.forEach(playerCard => {
      cardStrings.push(this.formatCardString(playerCard));
    });
    const contentLines: string[] = [
      "> ### Your Items",
      `> Cards: ${cardStrings.join(" ")}`,
      `> Tokens: ${this.formatTokenString(player.currentTokenTotal, -player.currentSpentTokenTotal)}`,
    ];
    return Utils.linesToString(contentLines);
  }

  private static formatPlayerListMessage(
    session: Session,
    includeTag: boolean = false,
  ): string {
    const contentLines: string[] = ["> ### Players"];
    DataController.getOrderedPlayers(session).forEach((player, index) => {
      contentLines.push(
        `> - **${this.formatPlayerNameString(player)}**${includeTag ? ` (${this.formatPlayerTagString(player)})` : ""}${index === session.currentPlayerIndex ? " 👤" : ""}`,
        `>   - Tokens: ${this.formatTokenString(player.currentTokenTotal, -player.currentSpentTokenTotal)}`,
      );
    });
    return Utils.linesToString(contentLines);
  }

  private static formatPlayerNameString(player: Player | DiscordUser): string {
    return (player.globalName ?? player.username).toUpperCase();
  }

  private static formatPlayerTagString(player: Player | DiscordUser): string {
    return `<@${player.id}>`;
  }

  private static formatTableDiscardMessage(session: Session): string {
    const discardCardStrings: string[] = [];
    if (session.sandDiscard.length > 0) {
      discardCardStrings.push(this.formatCardString(session.sandDiscard[0]));
    }
    if (session.bloodDiscard.length > 0) {
      discardCardStrings.push(this.formatCardString(session.bloodDiscard[0]));
    }
    const contentLines: string[] = [
      "> ### Discard",
      `> ${discardCardStrings.join(" ")}`,
    ];
    if (session.bloodDiscard.length === 0 && session.sandDiscard.length === 0) {
      contentLines.push("> -# `🟨` and `🟥` discard are both empty.");
    } else if (session.bloodDiscard.length === 0) {
      contentLines.push("> -# `🟥` discard is empty.");
    } else if (session.sandDiscard.length === 0) {
      contentLines.push("> -# `🟨` discard is empty.");
    }
    return Utils.linesToString(contentLines);
  }

  private static formatTokenString(
    baseTotal: number,
    adjustmentTotal: number,
    useLossIcon: boolean = false,
  ): string {
    if (baseTotal === 0 && adjustmentTotal <= 0) {
      return "`None`";
    }
    const baseTokenString: string = "⚪".repeat(
      Math.max(baseTotal + (adjustmentTotal <= 0 ? adjustmentTotal : 0), 0),
    );
    const reductionTokenString: string = (useLossIcon ? "🔴" : "⚫").repeat(
      Math.abs(adjustmentTotal),
    );
    return `\`${baseTokenString}${reductionTokenString}\``;
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

  public static async announceGameEnded(session: Session): Promise<void> {
    const activePlayers: Player[] = Object.values(session.players).filter(
      player => !player.isEliminated,
    );
    if (activePlayers.length !== 1) {
      Log.throw(
        "Cannot announce game ended. There is more than one remaining player.",
        session.players,
      );
    }
    const contentLines: string[] = [
      "# The Game Is Over!",
      `After ${(session.currentHandIndex + 1).toString()} hand${session.currentHandIndex === 0 ? "" : "s"}, the winner is...`,
      `## ${this.formatPlayerTagString(activePlayers[0])} 🎉`,
    ];
    const avatarUrl: string | null = this.formatPlayerAvatarUrl(
      activePlayers[0],
    );
    await Discord.sendMessage(
      session.channelId,
      Utils.linesToString(contentLines),
      undefined,
      avatarUrl !== null
        ? [
            {
              attachment: avatarUrl,
              name: "avatar.webp",
            },
          ]
        : undefined,
    );
  }

  public static async announceHandEnded(session: Session): Promise<void> {
    if (session.handResults.length < session.currentHandIndex + 1) {
      Log.throw(
        "Cannot announce hand ended. Results do not exist for the current hand.",
        session,
      );
    }
    const contentLines: string[] = [
      `## ✅ Ended Hand ${(session.currentHandIndex + 1).toString()}`,
      "Here are the results...",
    ];
    const usedPlayerIds: string[] = [];
    session.handResults[session.currentHandIndex].forEach(handResult => {
      const player: Player = DataController.getPlayerById(
        session,
        handResult.playerId,
      );
      const tokenDetailStrings: string[] = [];
      if (handResult.tokenLossTotal === 0) {
        tokenDetailStrings.push("Full Refund!");
      } else {
        if (handResult.spentTokenTotal > 0) {
          tokenDetailStrings.push(
            `\`${handResult.spentTokenTotal.toString()}\` Spent`,
          );
        }
        if (handResult.tokenPenaltyTotal > 0) {
          tokenDetailStrings.push(
            `\`${handResult.tokenPenaltyTotal.toString()}\` Penalty`,
          );
        }
      }
      contentLines.push(
        `- \`#${(handResult.rankIndex + 1).toString()}\` ${player.isEliminated ? `~~**${this.formatPlayerNameString(player)}**~~ 💀` : `**${this.formatPlayerNameString(player)}**`}`,
        `  - Cards: ${this.formatCardString(handResult.sandCard)} ${this.formatCardString(handResult.bloodCard)}`,
        `  - Tokens: \`${this.formatTokenString(player.currentTokenTotal, handResult.tokenLossTotal, true)}\` `,
        `    -# ${tokenDetailStrings.join(" + ")}`,
      );
      usedPlayerIds.push(handResult.playerId);
    });
    Object.values(session.players).forEach(player => {
      if (!usedPlayerIds.includes(player.id)) {
        contentLines.push(`~~${this.formatPlayerNameString(player)}~~ 💀`);
      }
    });
    await Discord.sendMessage(
      session.channelId,
      Utils.linesToString(contentLines),
    );
  }

  public static async announceRoundStarted(session: Session): Promise<void> {
    const contentLines: string[] = [];
    switch (session.currentRoundIndex) {
      case 0:
        contentLines.push(
          `## ❇️ Starting Hand ${(session.currentHandIndex + 1).toString()}`,
        );
        break;
      case 1:
      case 2:
        contentLines.push(
          `## ❇️ Starting Round ${(session.currentRoundIndex + 1).toString()}`,
        );
        break;
      default:
        contentLines.push("## ❇️ Starting Reveal Round");
    }
    await Discord.sendMessage(
      session.channelId,
      Utils.linesToString(contentLines),
    );
  }

  public static async announceTurnEnded(session: Session): Promise<void> {
    const player: Player = DataController.getPlayerById(
      session,
      session.playerOrder[session.currentPlayerIndex],
    );
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
            `A card was drawn from the \`${this.formatCardSuitIcon(player.currentTurnRecord.drawnCard.card.suit)}\` deck and ${this.formatCardString(player.currentTurnRecord.discardedCard.card)} was discarded.`,
          );
        } else {
          contentLines.push(
            `${this.formatCardString(player.currentTurnRecord.drawnCard.card)} was drawn from the \`${this.formatCardSuitIcon(player.currentTurnRecord.drawnCard.card.suit)}\` discard and ${this.formatCardString(player.currentTurnRecord.discardedCard.card)} was discarded.`,
          );
        }
        contentLines.push(this.formatTableDiscardMessage(session));
        break;
      case TurnAction.REVEAL: {
        contentLines.push(
          `## ☑️ ${this.formatPlayerNameString(player)} Completed Their Hand`,
          "Here are their final cards...",
          `# ${this.formatCardString(player.currentSandCards[0])} ${this.formatCardString(player.currentBloodCards[0])}`,
        );
        const bloodCardValue: number = GameController.getFinalCardValue(
          player.currentBloodCards[0],
          player.currentSandCards[0],
        );
        const sandCardValue: number = GameController.getFinalCardValue(
          player.currentSandCards[0],
          player.currentBloodCards[0],
        );
        if (bloodCardValue === sandCardValue) {
          switch (bloodCardValue) {
            case 0:
              contentLines.push("## *Sylop Sabacc!* ✨");
              break;
            case 1:
              contentLines.push("## *Prime Sabacc!*");
              break;
            case 6:
              contentLines.push("## *Cheap Sabacc!*");
              break;
            default:
              contentLines.push("## *Sabacc!*");
          }
        }
        break;
      }
      case TurnAction.STAND:
        contentLines.push(
          `## ${this.formatPlayerNameString(player)} Stood`,
          "No card was drawn or discarded.",
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

  public static async announceTurnStarted(session: Session): Promise<void> {
    const player: Player = DataController.getPlayerById(
      session,
      session.playerOrder[session.currentPlayerIndex],
    );
    const contentLines: string[] = [
      `## 🆙 ${this.formatPlayerNameString(player)}'s Turn`,
      `${this.formatPlayerTagString(player)} use the **/play** command to take your turn.`,
      this.formatHandRoundMessage(session),
      this.formatPlayerListMessage(session),
    ];
    await Discord.sendMessage(
      session.channelId,
      Utils.linesToString(contentLines),
    );
  }

  public static async informNoGame(
    discordInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
  ): Promise<void> {
    const contentLines: string[] = [
      "## No Game",
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
    discordInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
  ): Promise<void> {
    const contentLines: string[] = [
      "## Not Playing",
      "**You are not playing in the current game.**",
    ];
    await Discord.sendPersistentInteractionResponse(
      discordInteraction,
      Utils.linesToString(contentLines),
      true,
      {},
    );
  }

  public static async informNotTurn(
    session: Session,
    discordInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
  ): Promise<void> {
    const currentPlayer: Player = DataController.getPlayerById(
      session,
      session.playerOrder[session.currentPlayerIndex],
    );
    const contentLines: string[] = [
      "## Not Your Turn",
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
    session: Session,
    player: Player,
    discordInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
  ): Promise<void> {
    const contentLines: string[] = [
      this.formatHandRoundMessage(session),
      this.formatTableDiscardMessage(session),
      this.formatPlayerListMessage(session),
      this.formatPlayerItemsMessage(player),
    ];
    await Discord.sendPersistentInteractionResponse(
      discordInteraction,
      Utils.linesToString(contentLines),
      true,
      {},
    );
  }

  public static async informStartedGame(
    discordInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
  ): Promise<void> {
    await Discord.sendPersistentInteractionResponse(
      discordInteraction,
      "*You started a new game.*",
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
      "*Your turn is complete.*",
      true,
      {},
    );
  }

  public static async promptChooseDiscardCard(
    session: Session,
    player: Player,
    discordInteraction:
      | DiscordCommandInteraction
      | DiscordMessageComponentInteraction,
  ): Promise<[DiscordButtonInteraction, PlayerCard] | null> {
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
    if (playerCardSet.length !== 2) {
      Log.throw(
        "Cannot prompt choose discard card. Card set does not contain exactly 2 cards.",
        player,
      );
    }
    const buttonMap: Record<string, DiscordButtonBuilder> = {
      firstCard: new DiscordButtonBuilder()
        .setLabel(this.formatCardString(playerCardSet[0].card, false))
        .setStyle(DiscordButtonStyle.Primary),
      secondCard: new DiscordButtonBuilder()
        .setLabel(this.formatCardString(playerCardSet[1].card, false))
        .setStyle(DiscordButtonStyle.Primary),
    };
    const contentLines: string[] = [
      this.formatTableDiscardMessage(session),
      this.formatPlayerItemsMessage(player),
      "",
      "**Choose a card to keep. The other will be discarded.**",
    ];
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
        i => i.user.id === discordInteraction.user.id,
      );
    if (buttonInteraction === null) {
      await Discord.updateSentItem(
        interactionResponse,
        "*Discard action timed out.*",
        {},
      );
      return null;
    }
    switch (buttonInteraction.customId) {
      case "firstCard":
        return [buttonInteraction, playerCardSet[1]];
      case "secondCard":
        return [buttonInteraction, playerCardSet[0]];
      default:
        Log.throw(
          "Cannot prompt choose discard card. Unknown button interaction response ID.",
          buttonInteraction,
        );
    }
  }

  public static async promptChooseDrawSource(
    session: Session,
    player: Player,
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
      this.formatTableDiscardMessage(session),
      this.formatPlayerItemsMessage(player),
      "",
      "**Choose a draw option.**",
    ];
    if (session.sandDiscard.length > 0) {
      buttonMap.sandDiscard = new DiscordButtonBuilder()
        .setLabel(this.formatCardString(session.sandDiscard[0], false))
        .setStyle(DiscordButtonStyle.Primary);
    } else {
      contentLines.push("-# There is currently no sand discard to draw.");
    }
    if (session.bloodDiscard.length > 0) {
      buttonMap.bloodDiscard = new DiscordButtonBuilder()
        .setLabel(this.formatCardString(session.bloodDiscard[0], false))
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
        "*Card draw action timed out.*",
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
          buttonInteraction,
        );
    }
  }

  public static async promptChooseImposterDie(
    player: Player,
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
      this.formatPlayerItemsMessage(player),
      "",
      `**Choose the die value that you want to use for your ${this.formatCardString(playerCard.card)} card.**`,
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
        "*Die selection prompt timed out.*",
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
          buttonInteraction,
        );
    }
  }

  public static async promptChooseTurnAction(
    session: Session,
    player: Player,
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
      this.formatTableDiscardMessage(session),
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
        "*Turn play timed out.*",
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
          buttonInteraction,
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
        .setLabel("End Current Game")
        .setStyle(DiscordButtonStyle.Danger),
      cancel: new DiscordButtonBuilder()
        .setLabel("Cancel")
        .setStyle(DiscordButtonStyle.Secondary),
    };
    const contentLines: string[] = [
      "## Game In Progress",
      "**Do you want to end the current game and start a new one?**",
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
        "*End game prompt timed out.*",
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
          buttonInteraction,
        );
    }
  }

  public static async promptNewGameMembers(
    session: Session,
    discordInteraction: DiscordMessageComponentInteraction | null = null,
    discordUserAccumulator: DiscordUser[] = [],
  ): Promise<DiscordUser[] | null> {
    const joinerList: (Player | DiscordUser)[] = [
      ...Object.values(session.players),
      ...discordUserAccumulator,
    ];
    const buttonMap: Record<string, DiscordButtonBuilder> = {
      joinGame: new DiscordButtonBuilder()
        .setLabel("Join Game")
        .setStyle(DiscordButtonStyle.Primary),
      startGame: new DiscordButtonBuilder()
        .setLabel("Start Game")
        .setStyle(DiscordButtonStyle.Success)
        .setDisabled(joinerList.length <= 1),
    };
    const startingPlayer: Player = DataController.getPlayerById(
      session,
      session.startingPlayerId,
    );
    const baseContentLines: string[] = [
      "# New Game",
      `Hey ${this.formatChannelTagString()}! A new game was started by ${this.formatPlayerNameString(startingPlayer)}.`,
      "### Players",
      joinerList
        .map(
          joiner =>
            `- **${this.formatPlayerNameString(joiner)}** (${this.formatPlayerTagString(joiner)})`,
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
    const buttonInteraction: DiscordButtonInteraction | null =
      await this.handleButtonInteraction(
        outbound,
        null,
        "*Game creation timed out.*",
        600000,
      );
    if (buttonInteraction === null) {
      return null;
    }

    switch (buttonInteraction.customId) {
      case "joinGame":
        if (
          !joinerList.some(
            discordUser => discordUser.id === buttonInteraction.user.id,
          )
        ) {
          discordUserAccumulator.push(buttonInteraction.user);
        }
        return this.promptNewGameMembers(
          session,
          buttonInteraction,
          discordUserAccumulator,
        );
      case "startGame":
        await Discord.updateInteractionSourceItem(
          buttonInteraction,
          Utils.linesToString(baseContentLines),
          {},
        );
        return discordUserAccumulator;
      default:
        Log.throw(
          "Cannot resolve new game member prompt. Unknown button interaction response ID.",
          buttonInteraction,
        );
    }
  }

  public static async promptRevealCards(
    player: Player,
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
      this.formatPlayerItemsMessage(player),
      "",
      "**Reveal your cards and complete your hand.**",
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
        "*Reveal cards prompt timed out.*",
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
          buttonInteraction,
        );
    }
  }

  public static async promptRollForImposter(
    player: Player,
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
      this.formatPlayerItemsMessage(player),
      "",
      `**Roll the dice to get a value for your ${this.formatCardString(playerCard.card)} card.**`,
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
        "*Dice roll prompt timed out.*",
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
          buttonInteraction,
        );
    }
  }
}
