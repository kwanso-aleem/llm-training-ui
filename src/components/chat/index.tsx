import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import type { FC } from "react";
import ReactMarkdown from "react-markdown";

const API_URL = import.meta.env.VITE_API_URL;

const Chat: FC = () => {
  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    transport: new DefaultChatTransport({
      api: `${API_URL}/ai/chat`,
    }),
  });
  const [input, setInput] = useState("");

  console.log("<<<<<<<<<<< messages >>>>>>>>>>>>>", messages);

  return (
    <>
      <div className="messages">
        {messages.map((message) => (
          <div key={message.id}>
            <p>{message.role === "user" ? "User: " : "AI: "}</p>
            {message.parts.map((part, index) =>
              part.type === "text" ? (
                <ReactMarkdown key={index}>{part.text}</ReactMarkdown>
              ) : null
            )}
          </div>
        ))}

        {(status === "submitted" || status === "streaming") && (
          <div>
            {status === "submitted" && <div>Loading...</div>}
            <button type="button" onClick={() => stop()}>
              Stop
            </button>
          </div>
        )}
      </div>
      <div>
        {error && (
          <>
            <div>An error occurred: {error.message}</div>
            <button type="button" onClick={() => regenerate()}>
              Regenerate
            </button>
          </>
        )}
      </div>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput("");
          }
        }}
      >
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status !== "ready"}
          placeholder="Say something..."
        />
        <button type="submit" disabled={status !== "ready"}>
          Submit
        </button>
      </form>
    </>
  );
};

export default Chat;
