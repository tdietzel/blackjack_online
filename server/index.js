import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from 'uuid';

const wss = new WebSocketServer({ port: 8080 });
const connections = new Map();
let currentBets = [];
const currentBettors = new Set();
let deck = create_deck();

function create_deck() {
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const suits = ['Clubs', 'Diamonds', 'Hearts', 'Spades']
  let deck = [];
  ranks.forEach((rank) => {
    suits.forEach((suit) => {
      deck.push({'rank': rank, 'suit': suit});
    });
  });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck
}

wss.on("connection", (ws) => {
  console.log("Incoming connection...");

  ws.clientId = uuidv4();

  connections.set(ws, {
    clientId: ws.clientId,
    coins: 1000
  });

  ws.send(
    JSON.stringify({
      event: "JOINED",
      ...connections.get(ws),
    })
  );

  ws.on("message", (data) => {
    console.log(`received message ${data} from user ${ws.clientId}`);

    const decodedData = JSON.parse(data);

    if (
      currentBettors.has(ws.clientId) ||
      !connections.get(ws) ||
      connections.get(ws).coins <= decodedData.betAmount
    )
    return false;

    if(decodedData.event === 'START_GAME') {
      connections.get(ws).coins -= decodedData.betAmount;

      currentBets.push({
        clientId: ws.clientId,
        betAmount: decodedData.betAmount
      });
      currentBettors.add(ws.clientId);

      ws.send(JSON.stringify({
        clientBet: decodedData.betAmount,
        clientId: ws.clientId,
        event: "BET_PLACED",
        coins: connections.get(ws).coins
      }));
      ws.send(JSON.stringify({
        event: 'DEAL_CLIENT',
        clientDeck: [deck.pop(), deck.pop()]
      }));
      ws.send(JSON.stringify({
        event: 'DEAL_HOUSE',
        houseDeck: [deck.pop(), deck.pop()]
      }));
    }

    console.log("Current Bets: ", currentBets);
    console.log("Current Betters: ", currentBettors);
  });

  ws.on("close", () => {
    connections.delete(ws);
  });
});