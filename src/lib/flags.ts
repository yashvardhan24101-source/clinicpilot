/**
 * Server-Side Feature Flags
 * 
 * All feature flags default to `false` in production.
 * Must be read ONLY on the server (Server Components, Route Handlers, Middleware).
 * Pass to client components strictly via component props.
 */

export interface FeatureFlags {
  patientPortal: boolean;
  doctorChamber: boolean;
  digitalRx: boolean;
  publicDoctorSearch: boolean;
}

export function getFeatureFlags(): FeatureFlags {
  return {
    patientPortal: process.env.FEATURE_PATIENT_PORTAL === "true",
    doctorChamber: process.env.FEATURE_DOCTOR_CHAMBER === "true",
    digitalRx: process.env.FEATURE_DIGITAL_RX === "true",
    publicDoctorSearch: process.env.FEATURE_PUBLIC_DOCTOR_SEARCH === "true",
  };
}
