import React from "react";
import ClipboardParser from "../components/ClipboardParser";
import { useLocation } from "react-router-dom";
import SharedClipboardList from "@/components/SharedClipboardList";

const Index = () => {
  const location = useLocation();
  const selectedLibraryId = location.state?.selectedLibraryId;

  return (
    <div className="px-4 py-8">
      {selectedLibraryId ? (
        <SharedClipboardList selectedLibraryId={selectedLibraryId} />
      ) : (
        <ClipboardParser />
      )}
    </div>
  );
};

export default Index;