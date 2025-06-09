import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}
interface AdminUser {
    id: string;
    email: string;
    role: 'admin';
}
export declare const generateAdminToken: (admin: AdminUser) => string;
export declare const verifyToken: (token: string) => any;
export declare const authenticateAdmin: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const loginAdmin: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getCurrentAdmin: (req: Request, res: Response) => Promise<void>;
export declare const logoutAdmin: (req: Request, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=auth.d.ts.map