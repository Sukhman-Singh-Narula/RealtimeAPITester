import { useEffect, useRef, useState } from "react";
import logo from "/assets/openai-logomark.svg";
import EventLog from "./EventLog";
import SessionControls from "./SessionControls";
import ToolPanel from "./ToolPanel";

// Predefined Conversation Instructions
const predefinedInstructions = {
  introduction:
    "You are a friendly talking teddy bear. In this conversation, speak with the user using your voice. Ask for their name, age, the language they want to learn, their proficiency, and details about their life and hobbies. Once gathered, call the function 'save_user_data' with these details.",
  default:
    "You are a friendly talking teddy bear. In this conversation, speak with the user using your voice. Ask 'What kind of game would the user like to play?' and trigger the appropriate function if needed.",
  alphabet:
    "You are a teddy bear talking with a child. Your task is to teach the child the alphabet in Spanish using stories or rhymes that make learning fun. Do not talk about anything else.",
  counting:
    "You are a teddy bear talking with a child. Your task is to teach the child counting in Spanish from 1 to 10 using engaging stories. Keep the conversation focused on counting.",
};

const functions = [
  {
    type: "function",
    name: "updateInstructionsToAlphabet",
    description: "Switch the assistant's behavior to teach the alphabet in Spanish.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    type: "function",
    name: "teach_counting_in_spanish",
    description: "Switch the assistant's behavior to teach counting in Spanish using rhymes.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
];


export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const [currentInstructions, setCurrentInstructions] = useState(predefinedInstructions.default);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);

  async function startSession() {
    // Get an ephemeral key from the Fastify server
    const tokenResponse = await fetch("/token");
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.client_secret.value;

    // Create a peer connection
    const pc = new RTCPeerConnection();

    // Set up to play remote audio from the model
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

    // Add local audio track for microphone input in the browser
    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    pc.addTrack(ms.getTracks()[0]);

    // Set up data channel for sending and receiving events
    const dc = pc.createDataChannel("oai-events");
    dc.addEventListener("open", () => {
      setIsSessionActive(true);
      setEvents([]);
      sendSessionUpdate(dc);  // ✅ Ensure session update is sent only once
    });

    dc.addEventListener("message", (e) => {
      setEvents((prev) => [JSON.parse(e.data), ...prev]);
    });

    setDataChannel(dc);  // ✅ Now moved below event listeners

    // Start the session using the Session Description Protocol (SDP)
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-12-17";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        "Authorization": `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });


const answer = {
  type: "answer",
  sdp: await sdpResponse.text(),
};
await pc.setRemoteDescription(answer);

peerConnection.current = pc;
  }

// Stop current session, clean up peer connection and data channel
function stopSession() {
  if (dataChannel) {
    dataChannel.close();
  }

  peerConnection.current.getSenders().forEach((sender) => {
    if (sender.track) {
      sender.track.stop();
    }
  });

  if (peerConnection.current) {
    peerConnection.current.close();
  }

  setIsSessionActive(false);
  setDataChannel(null);
  peerConnection.current = null;
}

// Send a message to the model
function sendClientEvent(message) {
  if (dataChannel && dataChannel.readyState === "open") {
    message.event_id = message.event_id || crypto.randomUUID();
    dataChannel.send(JSON.stringify(message));
    setEvents((prev) => [message, ...prev]);
  } else {
    console.error("Failed to send message - no data channel available", message);
  }
}

// Send a text message to the model
function sendTextMessage(message) {
  const event = {
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text: message,
        },
      ],
    },
  };

  sendClientEvent(event);
  sendClientEvent({ type: "response.create" });
}

// Send a session update message with current instructions and configuration
function sendSessionUpdate(dc) {
  const sessionUpdate = {
    type: "session.update",
    session: {
      turn_detection: { type: "server_vad" },
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      voice: "alloy",
      instructions: currentInstructions,
      modalities: ["text", "audio"], // Updated to include both "text" and "audio"
      temperature: 0.7,
      functions: functions,
    },
  };
  dc.send(JSON.stringify(sessionUpdate));
}


// Handle an "update_topic" message to change the session instructions
function handleUpdateTopic(message) {
  const { topic } = message;
  const newInstructions = predefinedInstructions[topic] || predefinedInstructions.default;
  setCurrentInstructions(newInstructions);
  console.log("Updated instructions to:", newInstructions);
  sendClientEvent({
    type: "session.update",
    session: { instructions: newInstructions },
  });
}

function updateInstructionsToAlphabet() {
  setCurrentInstructions(predefinedInstructions.alphabet);
  sendSessionUpdate(dataChannel);
  console.log("Updated instructions to:", newInstructions);
}

function updateInstructionsToCounting() {
  setCurrentInstructions(predefinedInstructions.counting);
  sendSessionUpdate(dataChannel);
  console.log("Updated instructions to:", newInstructions);
}

function sendSessionUpdate(dc) {
  const sessionUpdate = {
    type: "session.update",
    session: {
      turn_detection: { type: "server_vad" },
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      voice: "alloy",
      instructions: currentInstructions,
      modalities: ["text", "audio"],
      temperature: 0.7,
      // functions: functions,
    },
  };
  dc.send(JSON.stringify(sessionUpdate));
}


// Attach event listeners to the data channel when it is created
  useEffect(() => {
    if (dataChannel) {
      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true);
        setEvents([]);
        sendSessionUpdate(dataChannel);  // Send session update only once
      });

      dataChannel.addEventListener("message", (e) => {
        try {
          const message = JSON.parse(e.data);
          if (message.type === "update_topic") {
            handleUpdateTopic(message);
          } else {
            setEvents((prev) => [message, ...prev]);
          }
        } catch (error) {
          console.error("Error parsing received message:", error);
        }
      });
    }
  }, [dataChannel]);


useEffect(() => {
  if (dataChannel) {
    dataChannel.addEventListener("open", () => {
      setIsSessionActive(true);
      setEvents([]);
      sendSessionUpdate(dataChannel);
    });

    dataChannel.addEventListener("message", (e) => {
      try {
        const message = JSON.parse(e.data);
        if (message.type === "response.done" && message.output?.function_call) {
          const { name } = message.output.function_call;
          if (name === "teach_alphabet_in_spanish") {
            setCurrentInstructions(predefinedInstructions.alphabet);
          } else if (name === "teach_counting_in_spanish") {
            setCurrentInstructions(predefinedInstructions.counting);
          }
          sendSessionUpdate(dataChannel);
        } else {
          setEvents((prev) => [message, ...prev]);
        }
      } catch (error) {
        console.error("Error parsing received message:", error);
      }
    });
  }
}, [dataChannel, currentInstructions]);


return (
  <>
    <nav className="absolute top-0 left-0 right-0 h-16 flex items-center">
      <div className="flex items-center gap-4 w-full m-4 pb-2 border-0 border-b border-solid border-gray-200">
        <img style={{ width: "24px" }} src={logo} alt="OpenAI Logo" />
        <h1>realtime console</h1>
      </div>
    </nav>
    <main className="absolute top-16 left-0 right-0 bottom-0">
      <section className="absolute top-0 left-0 right-[380px] bottom-0 flex">
        <section className="absolute top-0 left-0 right-0 bottom-32 px-4 overflow-y-auto">
          <EventLog events={events} />
        </section>
        <section className="absolute h-32 left-0 right-0 bottom-0 p-4">
          <SessionControls
            startSession={startSession}
            stopSession={stopSession}
            sendClientEvent={sendClientEvent}
            sendTextMessage={sendTextMessage}
            events={events}
            isSessionActive={isSessionActive}
          />
        </section>
      </section>
      <section className="absolute top-0 w-[380px] right-0 bottom-0 p-4 pt-0 overflow-y-auto">
        <ToolPanel
          sendClientEvent={sendClientEvent}
          sendTextMessage={sendTextMessage}
          events={events}
          isSessionActive={isSessionActive}
        />
      </section>
    </main>
  </>
);
}
