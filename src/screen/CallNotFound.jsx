import React from "react";
import { Link } from "react-router-dom";

export default function CallNotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-8 p-8">
      <h1 className="text-3xl md:text-4xl text-slate-700">
        The call you are looking for does not exist.
      </h1>
      <Link to="/">
        <button className="bg-emerald-500 w-full text-slate-50 px-12 py-4 rounded-full font-semibold tracking-widest shadow-md text-center">
          Go Home
        </button>
      </Link>
    </div>
  );
}
