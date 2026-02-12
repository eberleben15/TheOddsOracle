"use client";

import { useState, useEffect } from "react";
import { getTeamData } from "@/lib/team-data";

interface TeamLogoProps {
  teamName: string;
  size?: number;
  className?: string;
  logo?: string; // Optional logo URL to override the default (e.g. from ESPN)
}

export function TeamLogo({ teamName, size = 64, className = "", logo }: TeamLogoProps) {
  const teamData = getTeamData(teamName);
  const [imgSrc, setImgSrc] = useState(logo || teamData.logoUrl);

  useEffect(() => {
    setImgSrc(logo || teamData.logoUrl);
  }, [logo, teamData.logoUrl]);

  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    teamData.abbreviation
  )}&background=${teamData.primaryColor.replace("#", "")}&color=fff&size=${size}&bold=true`;

  return (
    <div
      className={`flex items-center justify-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: teamData.primaryColor + "20",
        border: `2px solid ${teamData.primaryColor}`,
      }}
    >
      <img
        src={imgSrc}
        alt={teamData.name}
        width={size - 8}
        height={size - 8}
        className="object-contain"
        onError={() => {
          setImgSrc(fallbackUrl);
        }}
      />
    </div>
  );
}

