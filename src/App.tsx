// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import ActivityBar from "./ui/ActivityBar";
import SideBar from "./ui/SideBar";
import MainPanel from "./ui/MainPanel";
import BottomPanel from "./ui/BottomPanel";
import StatusBar from "./ui/StatusBar";

function App() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <ActivityBar />
        <SideBar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MainPanel />
          <BottomPanel />
        </div>
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
