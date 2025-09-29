// src/types/express.d.ts
import { Request, Response, NextFunction } from 'express';

export type typeHandler = (
	req: Request,
	res: Response,
	next: NextFunction
) => void | Promise<void>;
