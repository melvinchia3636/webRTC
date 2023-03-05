import { Icon } from "@iconify/react";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { v4 } from "uuid";

export default function Home() {
  const [callID, setCallID] = useState("");

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 px-8 sm:px-16 md:px-32 lg:px-64 xl:px-96 text-slate-700">
      <Icon icon="logos:webrtc" className="w-32 h-32 mb-4" />
      <h1 className="text-4xl font-bold text-center">
        Have fun with <span className="text-emerald-500">WebRTC</span>!
      </h1>
      <p className="text-center">
        This is a simple video call app built with WebRTC technology. You can
        create a call or join an existing call.
      </p>
      <div className="w-full flex flex-col sm:flex-row items-center gap-2 mt-5">
        <div
          tabIndex={0}
          className="w-full border-2 border-slate-200 focus-within:border-emerald-500 transition-all rounded-md overflow-hidden flex items-center gap-2 px-4"
        >
          <Icon
            icon="ph:keyboard-bold"
            className="w-5 h-5 text-slate-400 mb-0.5"
          />
          <input
            className="w-full py-4 placeholder-slate-400 focus:outline-none text-slate-500 bg-transparent"
            placeholder="Enter an existing call ID"
            value={callID}
            onChange={(e) => setCallID(e.target.value)}
          />
        </div>
        <Link
          to={`/call/${callID}`}
          state={{ isNew: false }}
          className="sm:h-full w-full sm:w-auto"
        >
          <button
            disabled={callID === ""}
            className="bg-slate-50 sm:bg-white h-full py-4 block shadow-md sm:shadow-none w-full text-emerald-500 transition-all disabled:text-slate-400 hover:bg-emerald-50 disabled:hover:bg-white rounded-full sm:rounded-md px-6 tracking-widest font-medium"
          >
            Join
          </button>
        </Link>
      </div>
      <div className="w-full border-b-2 border-slate-200 relative my-4">
        <span className="text-slate-300 absolute bg-white top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 font-medium">
          OR
        </span>
      </div>
      <Link
        to={`/call/${v4()}`}
        state={{
          isNew: true,
        }}
        className="bg-emerald-500 hover:bg-emerald-600 transition-all w-full text-slate-50 px-12 py-4 rounded-full font-semibold tracking-widest shadow-md text-center"
      >
        Create a Call
      </Link>
    </div>
  );
}
