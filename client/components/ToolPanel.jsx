import { useEffect, useState } from "react";

// Define function call output UI for our functions.
function FunctionCallOutput({ functionCallOutput }) {
  return (
    <div className="p-4 bg-gray-100 rounded">
      <p className="font-bold">
        Function Called: {functionCallOutput.name}
      </p>
      <pre className="text-xs">{JSON.stringify(functionCallOutput, null, 2)}</pre>
    </div>
  );
}

// Session update message registering our functions.
// (This instructs the API that these functions are available.)
const sessionUpdate = {
  type: "session.update",
  session: {
    tools: [
      {
        type: "function",
        name: "teach_alphabet_in_spanish",
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
    ],
    tool_choice: "auto",
  },
};

export default function ToolPanel({ isSessionActive, sendClientEvent, events }) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [functionCallOutput, setFunctionCallOutput] = useState(null);

  useEffect(() => {
    if (!events || events.length === 0) return;

    // When the session is created, send the session update to register our functions.
    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      sendClientEvent(sessionUpdate);
      setFunctionAdded(true);
    }

    // Check the most recent event for a function call response.
    const mostRecentEvent = events[0];
    if (
      mostRecentEvent.type === "response.done" &&
      mostRecentEvent.response &&
      mostRecentEvent.response.output
    ) {
      mostRecentEvent.response.output.forEach((output) => {
        if (output.type === "function_call") {
          if (
            output.name === "teach_alphabet_in_spanish" ||
            output.name === "teach_counting_in_spanish"
          ) {
            setFunctionCallOutput(output);
            // Optionally, after a brief delay, you can send a response.create event
            // to prompt for further feedback.
            setTimeout(() => {
              sendClientEvent({
                type: "response.create",
                response: {
                  instructions: "Please let me know if you would like more details or examples.",
                },
              });
            }, 500);
          }
        }
      });
    }
  }, [events, functionAdded, sendClientEvent]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setFunctionCallOutput(null);
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">Instruction Update Tool</h2>
        {isSessionActive ? (
          functionCallOutput ? (
            <FunctionCallOutput functionCallOutput={functionCallOutput} />
          ) : (
            <p>Waiting for a function call from the assistant...</p>
          )
        ) : (
          <p>Start the session to use this tool...</p>
        )}
      </div>
    </section>
  );
}
