"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  BotMessageSquare,
  Expand,
  Send,
  Shrink,
  X,
} from "lucide-react";
import DOMPurify from "dompurify";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import { validateInputMessage } from "@/lib/utils";
import "@/styles/chatbot.css";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpand, setIsExpand] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const userMessage =
      (form.elements.namedItem("message") as HTMLTextAreaElement)?.value.trim();

    if (!userMessage) return;

    form.reset();

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: Date.now(),
        text: userMessage,
        sender: "user",
      },
    ]);

    const { isValid, error } = validateInputMessage(userMessage);
    if (!isValid && error) {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: Date.now(),
          text: error,
          sender: "bot",
        },
      ]);

      return;
    }

    const sanitizedInput = DOMPurify.sanitize(userMessage);

    try {
      const history = messages.map((message) => ({
        role: message.sender === "user" ? "user" : "model",
        parts: [{ text: message.text }],
      }));

      history.push({
        role: "user",
        parts: [{ text: sanitizedInput }],
      });

      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: sanitizedInput, history }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const botMessageId = Date.now();
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: botMessageId,
          text: "",
          sender: "bot",
        },
      ]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader!.read();
        done = readerDone;

        if (value) {
          const chunk = decoder.decode(value);
          setMessages((prevMessages) =>
            prevMessages.map((message) =>
              message.id === botMessageId
                ? { ...message, text: message.text + chunk }
                : message
            )
          );
        }
      }
    } catch (error) {
      console.error("Error fetching chatbot response:", error);

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: Date.now(),
          text: "Sorry, something went wrong. Please try again later.",
          sender: "bot",
        },
      ]);
    }
  };

  const toggleChat = () => {
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages]);

  const toggleExpand = () => {
    setIsExpand((prev) => !prev);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen
        ? (
          <div
            className={`bg-white rounded-lg shadow-xl flex flex-col chat-widget-enter  ${
              isExpand
                ? "chat-widget-expand w-[90vw] h-[96vh] md:w-[600px] md:h-[700px]"
                : "chat-widget-shrink w-80 h-96 md:w-[400px] md:h-[500px]"
            }`}
          >
            <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
              <h3 className="font-semibold flex items-center gap-1">
                Gemini Chatbot <BadgeCheck size={16} />
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleExpand}
                  className="text-white hover:text-gray-200"
                >
                  {isExpand ? <Shrink size={20} /> : <Expand size={20} />}
                </button>
                <button
                  onClick={toggleChat}
                  className="text-white hover:text-gray-200"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  } message-enter`}
                >
                  <div
                    className={`p-3 rounded-lg whitespace-pre-wrap overflow-auto ${
                      message.sender === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {message.sender === "bot"
                      ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            code({ className, children, ...props }) {
                              const match = /language-(\w+)/.exec(
                                className || "",
                              );
                              return !!match
                                ? (
                                  <SyntaxHighlighter
                                    style={dracula}
                                    language={match[1]}
                                  >
                                    {String(children).replace(/\n$/, "")}
                                  </SyntaxHighlighter>
                                )
                                : (
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                );
                            },
                          }}
                        >
                          {message.text}
                        </ReactMarkdown>
                      )
                      : <div>{message.text}</div>}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="p-3 border-t">
              <div className="flex items-center">
                <textarea
                  name="message"
                  placeholder="Type your message..."
                  className="flex-1 h-10 content-center resize-none focus:outline-none"
                  rows={1}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" && !e.shiftKey && "form" in e.target
                    ) {
                      e.preventDefault();
                      (e.target.form as HTMLFormElement).requestSubmit();
                    }
                  }}
                >
                </textarea>
                <button
                  type="submit"
                  className="p-2 text-blue-500 rounded-md hover:bg-blue-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </div>
        )
        : (
          <button
            onClick={toggleChat}
            className="bg-blue-500 text-white px-4 py-4 rounded-full flex items-center justify-center hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 ease-in-out transform hover:scale-105 chat-widget-exit"
          >
            <BotMessageSquare />
          </button>
        )}
    </div>
  );
}
