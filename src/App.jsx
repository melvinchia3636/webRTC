import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from "@firebase/firestore";
import { Icon } from "@iconify/react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";
import { Link } from "react-router-dom";
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

function CallScreen() {
  const pc = useMemo(() => new RTCPeerConnection(servers), []);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [webCamButtonDisabled, setWebCamButtonDisabled] = useState(false);
  const [hangUpButtonDisabled, setHangUpButtonDisabled] = useState(true);
  const [isWebCamOn, setIsWebCamOn] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { isNew } = location.state ?? {};

  const [_callID, _setCallID] = useState("");
  const callID = useRef(_callID);
  const setCallID = (data) => {
    callID.current = data;
    _setCallID(data);
  };

  const webcamVideo = useRef();
  const remoteVideo = useRef();

  useEffect(() => {
    startWebCam().then(() => {
      if (!isNew) {
        answerCall(id);
        return;
      }

      createCall(id);
    });
    pc.oniceconnectionstatechange = (e) => {
      if (
        ["disconnected", "failed", "closed"].includes(pc.iceConnectionState)
      ) {
        hangupCall();
      }
    };
  }, []);

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

  const startWebCam = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setLocalStream(stream);

    const rmStream = new MediaStream();
    setRemoteStream(rmStream);

    setWebCamButtonDisabled(true);
    setIsWebCamOn(true);
  };

  const createCall = async (id) => {
    const callDocRef = doc(firestore, "calls", id);
    const offerCandidates = collection(callDocRef, "offerCandidates");
    const answerCandidates = collection(callDocRef, "answerCandidates");

    setCallID(id);

    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await setDoc(callDocRef, { offer });

    onSnapshot(callDocRef, (snapshot) => {
      if (!snapshot.exists()) {
        navigate("/ended");
        return;
      }

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

  const answerCall = async (callId) => {
    setCallID(callId);
    const callDocRef = doc(firestore, "calls", callId);

    const callDoc = await getDoc(callDocRef);
    if (!callDoc.exists()) {
      navigate("/call-not-exist");
      return;
    }

    const answerCandidates = collection(callDocRef, "answerCandidates");
    const offerCandidates = collection(callDocRef, "offerCandidates");

    pc.onicecandidate = (e) => {
      e.candidate && addDoc(answerCandidates, e.candidate.toJSON());
    };

    const callData = (await getDoc(callDocRef)).data();

    const offerDescription = callData.offer;
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

    onSnapshot(callDocRef, (snapshot) => {
      if (!snapshot.exists()) {
        navigate("/ended", { replace: true });
      }
    });

    setHangUpButtonDisabled(false);
  };

  const hangupCall = async () => {
    const callDocRef = doc(firestore, "calls", callID.current);
    const offerCandidates = collection(callDocRef, "offerCandidates");
    const answerCandidates = collection(callDocRef, "answerCandidates");
    for (const candidate of (await getDocs(offerCandidates)).docs) {
      deleteDoc(candidate.ref);
    }
    for (const candidate of (await getDocs(answerCandidates)).docs) {
      deleteDoc(candidate.ref);
    }

    deleteDoc(callDocRef);
    navigate("/ended");
  };

  return (
    <>
      <section className="w-full h-full min-h-0 bg-white0 rounded-lg relative overflow-hidden border-2 border-slate-400">
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
        <span className="z-50 absolute bottom-4 left-4 bg-white pl-4 pr-2 py-3 rounded-md flex items-center gap-2 border-2 border-slate-400">
          {_callID || "No call ID"}
          <button
            className="text-slate-500 px-2 py-1 rounded-md"
            onClick={() => {
              navigator.clipboard.writeText(_callID);
              setLinkCopied(true);
              setTimeout(() => {
                setLinkCopied(false);
              }, 2000);
            }}
          >
            <Icon
              icon={linkCopied ? "ph:check-bold" : "ph:copy-bold"}
              className="w-5 h-5"
            />
          </button>
        </span>
      </section>

      <section className="flex gap-3 flex-col sm:flex-row w-full items-center justify-center">
        {!webCamButtonDisabled && (
          <button
            onClick={startWebCam}
            className="bg-slate-600 text-slate-50 shadow-md w-full sm:w-auto px-6 gap-2 h-16 flex items-center justify-center rounded-full font-semibold tracking-widest text-sm"
          >
            <Icon
              icon={
                isWebCamOn
                  ? "ph:video-camera-bold"
                  : "ph:video-camera-slash-bold"
              }
              className="w-5 h-5 text-slate-50"
            />
            Turn on WebCam
          </button>
        )}
        {!hangUpButtonDisabled && (
          <button
            onClick={hangupCall}
            className="bg-rose-500 text-slate-50 w-full sm:w-16 h-16 rounded-full disabled:bg-rose-700 flex items-center justify-center"
          >
            <Icon icon="ph:phone-x-bold" className="w-5 h-5" />
          </button>
        )}
      </section>
    </>
  );
}

function CallEnded() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-8">
      <h1 className="text-4xl text-slate-700">
        The call has ended. Thanks for using!
      </h1>
      <Link to="/">
        <button className="bg-emerald-500 w-full text-slate-50 px-12 py-4 rounded-full font-semibold tracking-widest shadow-md text-center">
          Go Home
        </button>
      </Link>
    </div>
  );
}

function CallNotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-8">
      <h1 className="text-4xl text-slate-700">
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

function Home() {
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
      <div className="w-full flex items-center gap-2 mt-5">
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
          className="h-full"
        >
          <button
            disabled={callID === ""}
            className="bg-white h-full block text-emerald-500 transition-all disabled:text-slate-400 hover:bg-emerald-50 disabled:hover:bg-white rounded-md px-6 tracking-widest font-medium"
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

function App() {
  return (
    <main className="text-center flex flex-col items-center justify-center gap-4 bg-white text-slate-700 w-full h-screen p-4">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/call/:id" element={<CallScreen />} />
        <Route path="/ended" element={<CallEnded />} />
        <Route path="/call-not-exist" element={<CallNotFound />} />
      </Routes>
      <p className="text-sm text-slate-500">
        Made with ❤️ by{" "}
        <a
          href="https://thecodeblog.net"
          target="_blank"
          rel="noreferrer"
          className="text-emerald-500 font-medium"
        >
          Melvin Chia
        </a>
        . Project under MIT License.
      </p>
    </main>
  );
}

export default App;
