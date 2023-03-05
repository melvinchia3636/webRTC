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
import { useLocation, useNavigate, useParams } from "react-router";
import { firestore } from "../firebase";

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

export default function CallScreen() {
  const pc = useMemo(() => new RTCPeerConnection(servers), []);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [hangUpButtonDisabled, setHangUpButtonDisabled] = useState(true);
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
        <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400 text-3xl">
          Waiting for other user to join...
        </p>
        <span className="w-full h-full relative z-40">
          <video
            ref={remoteVideo}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        </span>
        <span className="z-50 absolute bottom-4 left-4 bg-white pl-4 pr-2 py-3 rounded-md hidden md:flex items-center gap-2 border-2 border-slate-400">
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
      <span className="bg-white pl-4 pr-2 py-3 rounded-md flex md:hidden items-center gap-2 border-2 border-slate-400 text-left text-sm">
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

      <section className="flex gap-3 flex-col sm:flex-row w-full items-center justify-center">
        {!hangUpButtonDisabled && (
          <button
            onClick={hangupCall}
            className="bg-rose-500 text-slate-50 w-full sm:w-32 h-16 rounded-full disabled:bg-rose-700 shadow-md flex items-center justify-center"
          >
            <Icon icon="ph:phone-x-bold" className="w-5 h-5" />
          </button>
        )}
      </section>
    </>
  );
}
