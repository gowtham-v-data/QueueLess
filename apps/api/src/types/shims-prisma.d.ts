declare module '@prisma/client' {
  // Minimal shims for build-time until dependencies are installed.
  export namespace Prisma {
    export type UserCreateInput = any;
    export type UserUpdateInput = any;
    export type RefreshTokenCreateInput = any;
    // add other commonly referenced input types as `any` when needed
  }

  export type UserRole = any;
  export type UserStatus = any;
  export type OrganizationStatus = any;
  export type MembershipStatus = any;
  export type BranchStatus = any;
  export type CounterStatus = any;
  export type ServiceStatus = any;
  export type QueueStatus = any;
  export type QueuePriority = any;

  export const Prisma: any;

  export class PrismaClient {
    constructor(arg?: any);
  }

  export default PrismaClient;
}
