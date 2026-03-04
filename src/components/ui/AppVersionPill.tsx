import React, { useEffect, useState } from "react";
import { version } from "../../../package.json";
import { Github } from "lucide-react";

export const AppVersionPill: React.FC = () => {
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  useEffect(() => {
    handleVersionCheck();

    // Check for updates every hour
    const intervalId = setInterval(handleVersionCheck, 60 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  async function handleVersionCheck() {
    try {
      const response = await fetch(
        "https://api.github.com/repos/HGHugo/FreeboxOS-Ultra-Dashboard/releases/latest",
      );
      const data = await response.json();
      setLatestVersion(data.tag_name);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="relative group">
      <div className="flex flex-col text-xs bg-[#1a1a1a] px-3 py-1.5 rounded-lg border border-gray-700 cursor-pointer">
        <span className="font-bold">Dashboard</span>
        <span className="text-gray-400">
          Version {version}
          {latestVersion && latestVersion !== version ? (
            <span className="text-blue-400"> ({latestVersion} disponible)</span>
          ) : null}
        </span>
      </div>

      <div className="absolute top-full left-0 w-full h-2 z-[9998]" />

      <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute top-full left-0 mt-2 z-[9999] bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl p-3 min-w-[200px] whitespace-nowrap pointer-events-none group-hover:pointer-events-auto">
        <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
          Informations
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-sm gap-4">
            <span className="text-gray-300">Version actuelle</span>
            <span className="text-blue-400 font-medium">{version}</span>
          </div>
          {latestVersion && (
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="text-gray-300">Dernière version</span>
              <span className="text-green-400 font-medium">
                {latestVersion}
              </span>
            </div>
          )}
          <div className="pt-2 mt-2 border-t border-gray-700">
            <a
              href="https://github.com/HGHugo/FreeboxOS-Ultra-Dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Github size={16} />
              Voir sur GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
