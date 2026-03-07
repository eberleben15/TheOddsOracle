"use client";

import { useState } from "react";
import { Button, Modal, ModalContent, ModalHeader, ModalBody } from "@nextui-org/react";
import {
  QuestionMarkCircleIcon,
  BookOpenIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export interface MetricExplanationSection {
  title: string;
  content: React.ReactNode;
}

interface MetricExplanationPanelProps {
  /** Short tooltip text (shows on icon hover) */
  tooltip: string;
  /** Sections for the full modal */
  sections: MetricExplanationSection[];
  /** Optional badge/label next to icon */
  badge?: string;
}

export function MetricExplanationPanel({
  tooltip,
  sections,
  badge,
}: MetricExplanationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
        aria-label="Learn more"
        title={tooltip}
      >
        <BookOpenIcon className="h-4 w-4" />
        {badge && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{badge}</span>
        )}
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="2xl"
        scrollBehavior="inside"
        classNames={{
          base: "max-h-[85vh]",
          body: "overflow-y-auto",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <BookOpenIcon className="h-5 w-5 text-blue-600" />
              <span>Model Insights &amp; Learning Guide</span>
            </div>
          </ModalHeader>
          <ModalBody className="py-6">
            <div className="space-y-8">
              {sections.map((section, idx) => (
                <div key={idx}>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    {section.title}
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

/** Compact info icon that opens the full panel */
export function MetricInfoButton({
  tooltip,
  sections,
}: Omit<MetricExplanationPanelProps, "badge">) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex p-0 m-0 bg-transparent border-0 cursor-help text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 align-middle"
        aria-label="More info"
        title={tooltip}
      >
        <QuestionMarkCircleIcon className="h-3.5 w-3.5" />
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="2xl"
        scrollBehavior="inside"
        classNames={{
          base: "max-h-[85vh]",
          body: "overflow-y-auto",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <BookOpenIcon className="h-5 w-5 text-blue-600" />
              <span>Learn More</span>
            </div>
          </ModalHeader>
          <ModalBody className="py-6">
            <div className="space-y-8">
              {sections.map((section, idx) => (
                <div key={idx}>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    {section.title}
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
