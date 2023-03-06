import React from "react";

import { Icon } from "@iconify/react";
import { Route, Routes } from "react-router";

import CallEnded from "./screen/CallEnded";
import CallNotFound from "./screen/CallNotFound";
import CallScreen from "./screen/CallScreen";
import Home from "./screen/Home";

function App() {
  return (
    <main className="text-center flex flex-col items-center justify-center gap-4 bg-white text-slate-700 w-full h-screen p-4">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/call/:id" element={<CallScreen />} />
        <Route path="/ended" element={<CallEnded />} />
        <Route path="/call-not-exist" element={<CallNotFound />} />
      </Routes>
      <a
        href="https://github.com/melvinchia3636/webRTC"
        target="_blank"
        rel="noreferrer"
        className="fixed z-[9999] top-0 right-0 w-32 h-32 sm:w-48 sm:h-48"
      >
        <div className="bg-emerald-500 rotate-45 translate-x-1/2 -translate-y-1/2 w-full h-full"></div>
        <Icon
          icon="uil:github"
          className="w-8 h-8 sm:w-10 sm:h-10 text-white absolute top-2.5 right-2.5 sm:top-5 sm:right-5"
        />
      </a>
      <p className="text-sm text-slate-500">
        Made with ❤️ by{" "}
        <a
          href="https://thecodeblog.net"
          target="_blank"
          rel="noreferrer"
          className="text-emerald-500 font-medium hover:underline decoration-2"
        >
          Melvin Chia
        </a>
        . Project under MIT License.
      </p>
    </main>
  );
}

export default App;
