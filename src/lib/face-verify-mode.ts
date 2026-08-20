// How strictly the selfie camera gates the candidate.
//
//   "presence" (current default)
//     The camera step looks and behaves the same, but it only confirms that ONE
//     person is clearly visible in a good-quality frame. No liveness challenges
//     (blink / gaze), no identity match against the stored selfie, no
//     glasses / mask / background rejection. Everyone who shows a single face
//     proceeds.
//
//   "strict"
//     The full gate: randomized blink + gaze liveness, anti-spoof quality suite,
//     and a face match against the candidate's enrolment selfie.
//
// Set NEXT_PUBLIC_FACE_VERIFY_MODE=strict to restore the full gate. It is read on
// both the client and the server, so the two never disagree about what was checked.
//
// ⚠️ In "presence" mode the e-sign is NOT identity-verified by the camera. The
// remaining controls are the emailed OTP, the unique signing link, the session
// exit guard, and the IP / device / timestamp audit trail. The recorded evidence
// says so explicitly (`mode: "presence"`) rather than claiming checks that never
// ran — an audit record must never overstate what was verified.

export type FaceVerifyMode = "presence" | "strict";

export const FACE_VERIFY_MODE: FaceVerifyMode =
  (process.env.NEXT_PUBLIC_FACE_VERIFY_MODE || "").toLowerCase() === "strict" ? "strict" : "presence";

export const isStrictVerify = () => FACE_VERIFY_MODE === "strict";
export const isPresenceOnly = () => FACE_VERIFY_MODE === "presence";
