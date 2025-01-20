"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  BotMessageSquare,
  Expand,
  Loader2,
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
import { Button } from "@/components/ui/button";
import { validateInputMessage } from "@/lib/utils";
import { axiosApi, fetchApi } from "@/lib/api";

import type { Thread } from "@/types/thread";
import type { User } from "@/types/user";
import type { Message } from "@/types/message";

import "@/styles/chatbot.css";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [isExpand, setIsExpand] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize user
  useEffect(() => {
    const initializeUser = async () => {
      const storedUserId = localStorage.getItem("gemini-chatbot-userid");

      if (!storedUserId) {
        setIsLoading(true);
        await axiosApi.post(
          "/api/users",
        ).then((response) => {
          const user = response.data.user;

          localStorage.setItem("gemini-chatbot-userid", user.userId);
          setUser(user);
        }).catch((error) => {
          console.error(error.response.data);
        }).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(true);
        await axiosApi.get(
          `/api/users/${storedUserId}`,
        ).then((response) => {
          const user = response.data.user;

          localStorage.setItem("gemini-chatbot-userid", user.userId);
          setUser(user);
        }).catch((error) => {
          console.error(error.response.data);
        }).finally(() => {
          setIsLoading(false);
        });
      }
    };

    if (isOpen) {
      initializeUser();
    }
  }, [isOpen]);

  // Initialize active thread
  useEffect(() => {
    const initializeThread = async () => {
      if (user && !activeThread) {
        if (!user.threads[0]) {
          setIsLoading(true);
          await axiosApi.post(
            "/api/threads",
            {
              userId: user.userId,
            },
          ).then((response) => {
            const thread = response.data.thread;

            setActiveThread(thread);
          }).catch((error) => {
            console.error(error.response.data);
          }).finally(() => {
            setIsLoading(false);
          });
        } else {
          setIsLoading(true);
          await axiosApi.get(
            `/api/threads/${user.threads[0]}`,
          ).then((response) => {
            const thread = response.data.thread;

            setActiveThread(thread);
            thread.messages.map((message: Message) => {
              setMessages((prevMessages) => [
                ...prevMessages,
                {
                  text: message.text,
                  role: message.role,
                  timestamp: message.timestamp,
                },
              ]);
            });
          }).catch((error) => {
            console.error(error.response.data);
          }).finally(() => {
            setIsLoading(false);
          });
        }
      }
    };

    initializeThread();
  }, [user, activeThread]);

  // Scroll to chat bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages]);

  const addErrorMessageFromBot = (errorMessage?: string) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        timestamp: new Date(Date.now()),
        text: errorMessage ||
          "Sorry, something went wrong. Please try again later.",
        role: "bot",
      },
    ]);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const userMessage =
      (form.elements.namedItem("message") as HTMLTextAreaElement)?.value.trim();

    if (!userMessage) return;

    form.reset();

    const { isValid, error } = validateInputMessage(userMessage);
    if (!isValid && error) {
      addErrorMessageFromBot(error);
      return;
    }

    const sanitizedInput = DOMPurify.sanitize(userMessage);

    // Save message to thread
    if (activeThread) {
      await axiosApi.post(
        "/api/threads/message",
        {
          threadId: activeThread._id,
          role: "user",
          text: sanitizedInput,
        },
      ).catch((error) => {
        console.error("Error saving thread message", error.response.data);
      });
    } else {
      console.error("No thread found");
    }

    // Can still talk to bot even it might not be saved
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        timestamp: new Date(Date.now()),
        text: sanitizedInput,
        role: "user",
      },
    ]);

    try {
      const history = messages.map((message) => ({
        role: message.role === "user" ? "user" : "model",
        parts: [{ text: message.text }],
      }));

      history.push({
        role: "user",
        parts: [{ text: sanitizedInput }],
      });

      setIsLoading(true);
      const response = await fetchApi("/api/chat", {
        method: "POST",
        body: JSON.stringify({ input: sanitizedInput, history }),
      }).finally(() => {
        setIsLoading(false);
      });

      if (!response.ok) {
        addErrorMessageFromBot("Error getting data from Gemini");
        throw new Error(`Server error: ${response.status}`);
      }

      const botMessageId = new Date(Date.now());

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          text: "",
          role: "bot",
          timestamp: botMessageId,
        },
      ]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let botMessage = "";
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader!.read();
        done = readerDone;

        if (value) {
          const chunk = decoder.decode(value);
          botMessage += chunk;

          setMessages((prevMessages) =>
            prevMessages.map((message) =>
              new Date(message.timestamp).getTime() === botMessageId.getTime()
                ? { ...message, text: message.text + chunk }
                : message
            )
          );
        }
      }

      if (activeThread && done) {
        await axiosApi.post(
          "/api/threads/message",
          {
            threadId: activeThread._id,
            role: "bot",
            text: botMessage,
          },
        ).catch((error) => {
          console.error("Error saving thread message", error.response.data);
        });
      }
    } catch (error) {
      console.error("Error saving thread message:", error);
    }
  };

  const toggleChat = () => {
    setIsOpen((prev) => !prev);
  };

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
                ? "chat-widget-expand w-[90vw] h-[86vh] md:w-[600px] md:h-[700px]"
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
                  key={message.timestamp.toString()}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  } message-enter`}
                >
                  <div
                    className={`p-3 rounded-lg whitespace-pre-wrap overflow-auto ${
                      message.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {message.role === "bot"
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
                <Button
                  type="submit"
                  variant="ghost"
                  className="p-2 text-blue-500 rounded-md hover:bg-blue-600 hover:text-white hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  {isLoading
                    ? <Loader2 className="animate-spin" />
                    : <Send size={20} />}
                </Button>
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
