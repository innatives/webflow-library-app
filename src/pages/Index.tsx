import React from "react";
import ClipboardParser from "../components/ClipboardParser";
import SharedClipboardList from "../components/SharedClipboardList";

const Index = () => {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] gap-4 p-4">
      <div className="flex-none">
        <ClipboardParser />
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <SharedClipboardList />
      </div>
    </div>
  );
};

export default Index;