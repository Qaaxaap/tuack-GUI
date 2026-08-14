// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import Toolbar from "./ui/Toolbar";
import SideBar from "./ui/SideBar";
import MainPanel from "./ui/MainPanel";
import OutputDrawer from "./ui/OutputDrawer";

function App() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <SideBar />
        <MainPanel />
      </div>
      <OutputDrawer />
    </div>
  );
}

export default App;
