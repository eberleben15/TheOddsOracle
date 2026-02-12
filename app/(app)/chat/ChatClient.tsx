"use client";

import { useState, useRef, useEffect } from "react";
import { Button, Textarea } from "@nextui-org/react";
import { PaperAirplaneIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { ChatBetCards, RecommendedBet } from "./_components/ChatBetCard";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  structuredData?: {
    type: string;
    [key: string]: any;
  };
}

export function ChatClient() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I'm your betting assistant. I can help you with:\n\n• Upcoming games\n• Live games\n• Team statistics\n• Matchup predictions\n• Recommended bets\n• Head-to-head history\n\nWhat would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversation: messages,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      
      // Check if response contains structured data
      let structuredData = null;
      let displayContent = data.response || "I'm sorry, I couldn't process that request.";
      
      // Try to parse structured data
      if (data.structuredData) {
        structuredData = data.structuredData;
        // Use the message from structured data, not the JSON string
        displayContent = structuredData.message || displayContent;
      } else {
        try {
          const parsed = JSON.parse(data.response);
          if (parsed.type) {
            structuredData = parsed;
            // Use the message from structured data if available
            displayContent = parsed.message || displayContent;
          }
        } catch {
          // Not structured data, use response as-is
        }
      }
      
      // If we have structured data, make sure we're not showing JSON
      if (structuredData && displayContent && displayContent.trim().startsWith('{')) {
        // It's still JSON, use the message from structured data
        displayContent = structuredData.message || "Here are the recommended bets:";
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: displayContent,
        timestamp: new Date(),
        structuredData: structuredData,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <SparklesIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Betting Assistant</h1>
            <p className="text-sm text-gray-500">Ask me anything about games, teams, and bets</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {/* Render structured components if available */}
              {message.structuredData?.type === "recommended_bets" && (
                <div className="mb-3">
                  <ChatBetCards 
                    bets={message.structuredData.bets as RecommendedBet[]}
                    count={message.structuredData.count}
                  />
                </div>
              )}
              
              {/* Render text content - hide JSON when structured data is present */}
              {message.structuredData?.type === "recommended_bets" ? (
                // Only show the message text, not JSON
                message.content && !message.content.trim().startsWith("{") && (
                  <div className="whitespace-pre-wrap break-words text-sm text-gray-600 mb-2">
                    {message.content}
                  </div>
                )
              ) : (
                // Normal text response
                <div className="whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              )}
              
              <div
                className={`text-xs mt-2 ${
                  message.role === "user" ? "text-blue-100" : "text-gray-500"
                }`}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about games, teams, predictions, or bets..."
            minRows={1}
            maxRows={4}
            classNames={{
              base: "flex-1",
              input: "resize-none",
            }}
            disabled={isLoading}
          />
          <Button
            color="primary"
            isIconOnly
            onClick={handleSend}
            isLoading={isLoading}
            disabled={!input.trim() || isLoading}
            className="self-end"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

