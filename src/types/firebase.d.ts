// Re-export types from @firebase/* subpackages (Firebase v12 modular API)
declare module "firebase/app" {
  export * from "@firebase/app";
  export { FirebaseApp, FirebaseOptions } from "@firebase/app";
}

declare module "firebase/auth" {
  export * from "@firebase/auth";
}

declare module "firebase/firestore" {
  export * from "@firebase/firestore";
}
