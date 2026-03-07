"use client";

import {
  Card,
  CardBody,
  CardHeader,
} from "@nextui-org/react";
import Link from "next/link";
import {
  BookOpenIcon,
  ChartBarIcon,
  ArrowRightIcon,
  BeakerIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import {
  FACTOR_CONTRIBUTIONS_SECTIONS,
  CALIBRATION_RELIABILITY_SECTIONS,
  BRIER_SECTIONS,
  LOG_LOSS_SECTIONS,
  ECE_SECTIONS,
  METRICS_GLOSSARY_SECTIONS,
} from "@/lib/model-insights-content";

export function ModelInsightsClient() {
  const allSections = [
    { title: "Factor Contributions", sections: FACTOR_CONTRIBUTIONS_SECTIONS },
    { title: "Calibration Reliability", sections: CALIBRATION_RELIABILITY_SECTIONS },
    { title: "Brier Score", sections: BRIER_SECTIONS },
    { title: "Log Loss", sections: LOG_LOSS_SECTIONS },
    { title: "ECE (Expected Calibration Error)", sections: ECE_SECTIONS },
    { title: "Metrics Glossary", sections: METRICS_GLOSSARY_SECTIONS },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpenIcon className="h-7 w-7 text-blue-600" />
          Model Insights &amp; Learning Guide
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-2xl">
          Learn how our prediction model works, how to interpret charts and metrics, and how to use the admin tools effectively. Use this guide alongside{" "}
          <Link href="/admin/methods" className="text-blue-600 hover:underline">Methods</Link> and{" "}
          <Link href="/admin/model-performance" className="text-blue-600 hover:underline">Model Performance</Link>.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/methods">
          <Card className="hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer h-full">
            <CardBody className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <BeakerIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold">Prediction Methods</p>
                  <p className="text-xs text-gray-500">Factor contributions, calibration, Platt vs Isotonic</p>
                </div>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400" />
            </CardBody>
          </Card>
        </Link>
        <Link href="/admin/model-performance">
          <Card className="hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer h-full">
            <CardBody className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <ChartBarIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold">Model Performance</p>
                  <p className="text-xs text-gray-500">Brier, Log Loss, ATS, calibration metrics</p>
                </div>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400" />
            </CardBody>
          </Card>
        </Link>
      </div>

      {/* Full reference */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5" />
            Full Reference
          </h2>
        </CardHeader>
        <CardBody className="space-y-10">
          {allSections.map((group) => (
            <div key={group.title}>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                {group.title}
              </h3>
              <div className="space-y-6 pl-2">
                {group.sections.map((section, idx) => (
                  <div key={idx}>
                    <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                      {section.title}
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                      {section.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
