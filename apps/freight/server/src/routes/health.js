import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    status: "healthy",
    checkedAt: new Date().toISOString()
  });
});
