import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "@firebase/firestore";
import { Icon } from "@iconify/react";
import React, { useEffect, useRef, useState } from "react";
import { v4 } from "uuid";
import { firestore } from "./firebase";

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

let pc = new RTCPeerConnection(servers);

function App() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callInput, setCallInput] = useState("");
  const [createCallButtonDisabled, setCreateCallButtonDisabled] =
    useState(true);
  const [answerCallButtonDisabled, setAnswerCallButtonDisabled] =
    useState(true);
  const [hangUpButtonDisabled, setHangUpButtonDisabled] = useState(true);
  const [isWebCamOn, setIsWebCamOn] = useState(false);

  const webcamVideo = useRef();
  const remoteVideo = useRef();

  useEffect(() => {
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      webcamVideo.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream) {
      remoteVideo.current.srcObject = remoteStream;

      pc.ontrack = (e) => {
        e.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
      };
    }
  }, [remoteStream]);

  useEffect(() => {
    pc.oniceconnectionstatechange = (e) => {
      if (
        ["disconnected", "failed", "closed"].includes(pc.iceConnectionState)
      ) {
        console.log("sus");
        hangupCall();
      }
    };
  }, []);

  const startWebCam = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setLocalStream(stream);

    const rmStream = new MediaStream();
    setRemoteStream(rmStream);

    setCreateCallButtonDisabled(false);
    setAnswerCallButtonDisabled(false);
    setIsWebCamOn(true);
  };

  const createCall = async () => {
    const id = v4();

    const callDocRef = doc(firestore, "calls", id);
    const offerCandidates = collection(callDocRef, "offerCandidates");
    const answerCandidates = collection(callDocRef, "answerCandidates");

    setCallInput(id);

    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await setDoc(callDocRef, { offer });

    onSnapshot(callDocRef, (snapshot) => {
      const data = snapshot.data();
      if (!pc.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.setRemoteDescription(answerDescription);
      }
    });

    onSnapshot(answerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          let data = change.doc.data();
          pc.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });

    pc.onicecandidate = (e) => {
      e.candidate && addDoc(offerCandidates, e.candidate.toJSON());
    };

    setHangUpButtonDisabled(false);
  };

  const answerCall = async () => {
    const callId = callInput;
    const callDocRef = doc(firestore, "calls", callId);
    const answerCandidates = collection(callDocRef, "answerCandidates");
    const offerCandidates = collection(callDocRef, "offerCandidates");

    pc.onicecandidate = (e) => {
      e.candidate && addDoc(answerCandidates, e.candidate.toJSON());
    };

    const callData = (await getDoc(callDocRef)).data();

    const offerDescription = callData.offer;
    console.log(offerDescription);
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await updateDoc(callDocRef, { answer });

    onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          let data = change.doc.data();
          pc.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });

    setHangUpButtonDisabled(false);
  };

  const hangupCall = () => {
    pc.close();
    pc = new RTCPeerConnection(servers);
    setCallInput("");
    setAnswerCallButtonDisabled(true);
    setHangUpButtonDisabled(true);

    remoteVideo.current.srcObject = null;
  };

  return (
    <main className="text-center flex flex-col items-center justify-center gap-4 bg-slate-50 text-slate-800 w-full h-screen p-8">
      <section className="w-full h-full min-h-0 bg-slate-500 rounded-lg relative overflow-hidden border-2 border-slate-400">
        <span className="w-64 aspect-video absolute bottom-4 right-4 border-2 border-slate-400 rounded-md overflow-hidden z-50">
          <Icon
            icon="ph:video-camera-slash-bold"
            className="w-12 h-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400"
          />
          <video
            ref={webcamVideo}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover relative z-50"
          />
        </span>
        <Icon
          icon="ph:video-camera-slash-bold"
          className="w-32 h-32 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400"
        />
        <span className="w-full h-full relative z-40">
          <video
            ref={remoteVideo}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        </span>
      </section>

      <section className="flex gap-3">
        <button
          onClick={startWebCam}
          className={`bg-rose-500 text-slate-50 w-16 h-16 flex items-center justify-center rounded-full`}
        >
          <Icon
            icon={
              isWebCamOn ? "ph:video-camera-bold" : "ph:video-camera-slash-bold"
            }
            className="w-5 h-5 text-slate-50"
          />
        </button>
        <button
          onClick={createCall}
          disabled={createCallButtonDisabled}
          className="bg-slate-600 text-slate-50 px-6 gap-2 h-16 rounded-full flex items-center justify-center disabled:bg-slate-400"
        >
          <Icon icon="ph:plus-bold" className="w-5 h-5" />
          Create Call
        </button>
        <input
          value={callInput}
          onChange={(e) => setCallInput(e.target.value)}
          className=" border-2 h-16 px-6 rounded-full border-slate-400 bg-transparent placeholder-slate-400 focus:ring-slate-300"
          placeholder="Paste the call ID here"
        />
        <button
          onClick={answerCall}
          disabled={answerCallButtonDisabled}
          className="bg-emerald-500 text-slate-50 w-16 h-16 rounded-full flex items-center justify-center disabled:bg-emerald-600"
        >
          <Icon icon="ph:arrow-right-bold" className="w-5 h-5" />
        </button>
        {!hangUpButtonDisabled && (
          <button
            onClick={hangupCall}
            className="bg-rose-500 text-slate-50 w-16 h-16 rounded-full disabled:bg-rose-700 flex items-center justify-center"
          >
            <Icon icon="ph:phone-x-bold" className="w-5 h-5" />
          </button>
        )}
      </section>
    </main>
  );
}

export default App;
