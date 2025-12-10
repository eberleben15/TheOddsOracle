"use client";

import { Card, CardBody } from "@nextui-org/react";

interface StatsCardsProps {
  liveCount: number;
  upcomingCount: number;
}

export function StatsCards({ liveCount, upcomingCount }: StatsCardsProps) {
  const stats = [
    {
      label: "Live Games",
      value: liveCount,
      icon: "🔴",
      bgColor: "bg-danger/10",
      textColor: "text-danger",
    },
    {
      label: "Upcoming",
      value: upcomingCount,
      icon: "📅",
      bgColor: "bg-primary/10",
      textColor: "text-primary",
    },
    {
      label: "Total Games",
      value: liveCount + upcomingCount,
      icon: "🏀",
      bgColor: "bg-success/10",
      textColor: "text-success",
    },
    {
      label: "League",
      value: "NCAA",
      icon: "📊",
      bgColor: "bg-warning/10",
      textColor: "text-warning",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, idx) => (
        <Card key={idx} className="bg-white shadow-sm border border-border-gray">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-body mb-1">{stat.label}</p>
                <h3 className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</h3>
              </div>
              <div className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <span className="text-2xl">{stat.icon}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

