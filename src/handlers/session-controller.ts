import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CollectorFilter,
  ComponentType,
  InteractionCollector,
  Message,
  User,
} from "discord.js";
import {
  GameController,
  InteractionController,
} from ".";
import {
  SessionStatus,
} from "../enums";
import {
  IO,
} from "../io";
import {
  Card,
  PlayerState,
  SessionState,
} from "../types";
import {
  Utils,
} from "../utils";
import {
  createBloodDeck,
  createSandDeck,
} from "../constants/game/decks";

export class SessionController {
  private static async handleJoinButtonPress(
    session: SessionState,
    buttonInteraction: ButtonInteraction,
    gameMessage: Message,
    joinButton: ButtonBuilder,
    startButton: ButtonBuilder,
  ): Promise<void> {
    if (!session.players.some(player => player.id === buttonInteraction.user.id)) {
      // Add the new player
      const newPlayer: PlayerState = {
        "currentBloodCards": [
        ],
        "currentPlayedTokenTotal": 0,
        "currentSandCards": [
        ],
        "currentUnplayedTokenTotal": session.startingTokenTotal,
        "id": buttonInteraction.user.id,
        "username": buttonInteraction.user.username,
      };
      session.players.push(newPlayer);
      this.saveSession(session);
      // Update the message
      await gameMessage.edit({
        "content": InteractionController.getNewGameMessageContent(
          session,
          [
            "**Click the button below to join!**",
          ],
        ),
        "components": [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            joinButton,
            startButton.setDisabled(session.players.length < 2), // Enable when there are 2+ players
          ),
        ],
      });
    }
    await buttonInteraction.deferUpdate(); // Acknowledge the interaction
  }

  private static async handleStartButtonPress(
    session: SessionState,
    gameMessage: Message,
    collector: InteractionCollector<ButtonInteraction>,
  ): Promise<void> {
    // Lock the new game message
    await gameMessage.edit({
      "content": InteractionController.getNewGameMessageContent(
        session,
        [
          "**The game has started!**",
          "",
          "-# Use the **/info** command to view your hand and see game info.",
        ],
      ),
      "components": [
      ], // Remove the buttons
    });
    // Prep and start the session
    session.players = Utils.shuffleArray(session.players);
    for (const player of session.players) {
      player.currentBloodCards.push(GameController.removeTopCard(session.bloodDeck));
      player.currentSandCards.push(GameController.removeTopCard(session.sandDeck));
    }
    session.bloodDiscard.push(GameController.removeTopCard(session.bloodDeck));
    session.sandDiscard.push(GameController.removeTopCard(session.sandDeck));
    session.startedAt = Date.now();
    session.status = SessionStatus.ACTIVE;
    this.saveSession(session);
    // End the collector
    collector.stop();
    // Begin first turn
    await GameController.startTurn(session);
  }

  public static async createSession(
    guildId: string,
    channelId: string,
    startingUser: User,
    startingTokenTotal: number,
  ): Promise<void> {
    // Initialize session
    const startingPlayer: PlayerState = {
      "currentBloodCards": [
      ],
      "currentPlayedTokenTotal": 0,
      "currentSandCards": [
      ],
      "currentUnplayedTokenTotal": startingTokenTotal,
      "id": startingUser.id,
      "username": startingUser.username,
    };
    const bloodDeck: Card[] = Utils.shuffleArray<Card>(createBloodDeck());
    const sandDeck: Card[] = Utils.shuffleArray<Card>(createSandDeck());
    const session: SessionState = {
      "bloodDeck": bloodDeck,
      "bloodDiscard": [
      ],
      "channelId": channelId,
      "currentPlayerIndex": 0,
      "currentRoundIndex": 0,
      "currentTurnIndex": 0,
      "guildId": guildId,
      "players": [
        startingPlayer,
      ],
      "sandDeck": sandDeck,
      "sandDiscard": [
      ],
      "startingPlayer": startingPlayer,
      "startingTokenTotal": startingTokenTotal,
      "status": SessionStatus.PENDING,
    };
    this.saveSession(session);
    // Prompt channel users to join
    const joinButton: ButtonBuilder = new ButtonBuilder()
      .setCustomId("joinGame")
      .setLabel("Join Game")
      .setStyle(ButtonStyle.Primary);
    const startButton: ButtonBuilder = new ButtonBuilder()
      .setCustomId("startGame")
      .setLabel("Start Game")
      .setStyle(ButtonStyle.Success)
      .setDisabled(true);
    const gameMessage: Message = await InteractionController.sendMessage(
      channelId,
      InteractionController.getNewGameMessageContent(
        session,
        [
          "**Click the button below to join!**",
        ],
      ),
      [
        joinButton,
        startButton,
      ],
    );
    // Listen for user join requests
    const collectorFilter: CollectorFilter<[ButtonInteraction]> = (buttonInteraction: ButtonInteraction) =>
      buttonInteraction.message.id === gameMessage.id && [
        "joinGame",
        "startGame",
      ].includes(buttonInteraction.customId);
    const tenMinuteMilliseconds: number = 600000;
    const collector: InteractionCollector<ButtonInteraction> = gameMessage.createMessageComponentCollector({
      "filter": collectorFilter,
      "componentType": ComponentType.Button,
      "time": tenMinuteMilliseconds,
    });
    collector.on(
      "collect",
      (buttonInteraction: ButtonInteraction) => {
        if (buttonInteraction.customId === "joinGame") {
          this.handleJoinButtonPress(
            session,
            buttonInteraction,
            gameMessage,
            joinButton,
            startButton,
          ).catch((reason: unknown) => {
            console.error("Failed to handle join button press.");
            console.error(reason);
          });
        } else if (buttonInteraction.customId === "startGame") {
          this.handleStartButtonPress(
            session,
            gameMessage,
            collector,
          ).catch((reason: unknown) => {
            console.error("Failed to handle start button press.");
            console.error(reason);
          });
        }
      },
    );
    collector.on(
      "end",
      () => {
        // On timeout
        if (session.status === SessionStatus.PENDING && gameMessage.editable) {
          gameMessage.edit({
            "content": InteractionController.getNewGameMessageContent(
              session,
              [
                "**Game setup timed out!**",
              ],
            ),
            "components": [
            ], // Remove the buttons
          }).catch((reason: unknown) => {
            console.error("Failed to modify new game message on timeout.");
            console.error(reason);
          });
        }
      },
    );
  }

  public static loadSession(guildId: string, channelId: string): SessionState | null {
    const loadResult: SessionState | null = IO.loadData(
      `${guildId}${channelId}`,
    ) as SessionState;
    return loadResult;
  }

  public static saveSession(session: SessionState): void {
    IO.saveData(
      `${session.guildId}${session.channelId}`,
      session,
    );
  }
}
