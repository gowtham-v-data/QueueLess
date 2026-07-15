declare module 'express' {
  export type Request = any;
  export type Response = any;
  export type NextFunction = (...args: any[]) => any;
  export function Router(): any;
  const express: any;
  export default express;
}
