import queue from "@/services/queue";
import { Job } from "bullmq";
import { Request, RequestHandler, Response } from "express";

const queueJob: RequestHandler = async (req: Request, res: Response) => {
  const { link } = req.body;

  if (!link) {
    res.status(400).json({ error: "Link is required" });
  }

  const job = await queue.add("repo", {
    link,
    user: {
      id: req.session.user!._id,
      access_token: req.session.user!.access_token,
    },
  });

  res.status(202).json({ message: "Task is being processed", jobId: job.id });
};

const getJobStatus: RequestHandler = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Get the job from the queue using its job ID
    const job: Job | null = await queue.getJob(id);

    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    // Get the job status
    const status = await job.getState();
    const progress = job.progress;
    const finishedOn = job.finishedOn;
    const failedReason = job.failedReason;

    res.status(200).json({
      jobId: id,
      status,
      progress,
      finishedOn,
      failedReason,
    });
    return;
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "An error occurred while retrieving job status" });
    return;
  }
};

const JobController = { queueJob, getJobStatus };
export { JobController };
