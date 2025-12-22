"use client";

import { Card, CardBody } from "@nextui-org/react";
import { 
  InboxIcon, 
  MagnifyingGlassIcon,
  CalendarIcon,
  ChartBarIcon 
} from "@heroicons/react/24/outline";

interface EmptyStateProps {
  type?: "no_games" | "no_results" | "no_data" | "no_predictions";
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ 
  type = "no_data", 
  title, 
  message,
  action 
}: EmptyStateProps) {
  const getIcon = () => {
    switch (type) {
      case "no_games":
        return <CalendarIcon className="h-12 w-12 text-gray-400" />;
      case "no_results":
        return <MagnifyingGlassIcon className="h-12 w-12 text-gray-400" />;
      case "no_predictions":
        return <ChartBarIcon className="h-12 w-12 text-gray-400" />;
      default:
        return <InboxIcon className="h-12 w-12 text-gray-400" />;
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case "no_games":
        return "No Games Found";
      case "no_results":
        return "No Results";
      case "no_predictions":
        return "No Predictions Available";
      default:
        return "No Data Available";
    }
  };

  const getDefaultMessage = () => {
    switch (type) {
      case "no_games":
        return "There are no upcoming games at this time. Check back later for new matchups.";
      case "no_results":
        return "No games match your search criteria. Try adjusting your filters.";
      case "no_predictions":
        return "Predictions are not available for this game yet.";
      default:
        return "No data is available to display.";
    }
  };

  return (
    <Card className="bg-gray-50 border border-gray-200">
      <CardBody className="p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4">
            {getIcon()}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {title || getDefaultTitle()}
          </h3>
          <p className="text-gray-600 max-w-md mb-6">
            {message || getDefaultMessage()}
          </p>
          {action && (
            <button
              onClick={action.onClick}
              className="px-6 py-3 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {action.label}
            </button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

