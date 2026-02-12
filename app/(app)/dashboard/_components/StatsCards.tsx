"use client";

import { Card, CardBody } from "@nextui-org/react";
import {
  SignalIcon,
  CalendarIcon,
  TrophyIcon,
  ChartBarIcon
} from "@heroicons/react/24/outline";

interface StatsCardsProps {
  liveCount: number;
  upcomingCount: number;
}

export function StatsCards({ liveCount, upcomingCount }: StatsCardsProps) {
  const stats = [
    {
      label: "Live Games",
      value: liveCount,
      Icon: SignalIcon,
      bgColor: "bg-gray-100",
      iconColor: "text-gray-600",
      textColor: "text-gray-700",
    },
    {
      label: "Upcoming",
      value: upcomingCount,
      Icon: CalendarIcon,
      bgColor: "bg-gray-100",
      iconColor: "text-gray-600",
      textColor: "text-gray-700",
    },
    {
      label: "Total Games",
      value: liveCount + upcomingCount,
      Icon: TrophyIcon,
      bgColor: "bg-gray-100",
      iconColor: "text-gray-600",
      textColor: "text-gray-700",
    },
    {
      label: "League",
      value: "NCAA",
      Icon: ChartBarIcon,
      bgColor: "bg-gray-100",
      iconColor: "text-gray-600",
      textColor: "text-gray-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, idx) => (
        <Card key={idx} className="bg-white shadow-sm border border-gray-200">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                <h3 className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</h3>
              </div>
              <div className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.Icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
